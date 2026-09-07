<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Recipes\CircularRecipeException;
use App\Domain\Recipes\RecipeCostingService;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Recipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RecipeController extends Controller
{
    public function __construct(private readonly RecipeCostingService $costing) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('catalog.recipes.view'), 403);

        $recipes = Recipe::query()
            ->with(['product', 'yieldUnit', 'items.component', 'items.unit'])
            ->when($request->filled('product_id'), fn ($q) => $q->where('product_id', $request->string('product_id')))
            ->orderByDesc('updated_at')
            ->get();

        return response()->json($recipes);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('catalog.recipes.manage'), 403);

        $data = $this->validated($request);

        $recipe = DB::transaction(function () use ($data, $request) {
            $version = (int) Recipe::query()->where('product_id', $data['product_id'])->max('version') + 1;

            if (! empty($data['is_active'])) {
                Recipe::query()->where('product_id', $data['product_id'])->update(['is_active' => false]);
            }

            $items = $data['items'] ?? [];
            unset($data['items']);

            $recipe = Recipe::query()->create($data + [
                'company_id' => $request->user()->company_id,
                'version' => $version,
            ]);

            foreach ($items as $index => $item) {
                $recipe->items()->create($item + ['sort_order' => $index]);
            }

            return $recipe;
        });

        try {
            $this->costing->refreshCachedCost($recipe);
        } catch (CircularRecipeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($recipe->fresh(['product', 'items.component', 'items.unit', 'yieldUnit']), 201);
    }

    public function show(Request $request, Recipe $recipe): JsonResponse
    {
        abort_unless($request->user()->can('catalog.recipes.view'), 403);

        return response()->json($recipe->load(['product', 'yieldUnit', 'items.component.baseUnit', 'items.unit']));
    }

    public function update(Request $request, Recipe $recipe): JsonResponse
    {
        abort_unless($request->user()->can('catalog.recipes.manage'), 403);

        $data = $this->validated($request, updating: true);

        DB::transaction(function () use ($recipe, $data) {
            if (! empty($data['is_active'])) {
                Recipe::query()->where('product_id', $recipe->product_id)->where('id', '!=', $recipe->id)->update(['is_active' => false]);
            }

            $items = $data['items'] ?? null;
            unset($data['items']);
            $recipe->update($data);

            if (is_array($items)) {
                $recipe->items()->delete();
                foreach ($items as $index => $item) {
                    $recipe->items()->create($item + ['sort_order' => $index]);
                }
            }
        });

        try {
            $this->costing->refreshCachedCost($recipe->fresh());
        } catch (CircularRecipeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($recipe->fresh(['product', 'items.component', 'items.unit', 'yieldUnit']));
    }

    public function cost(Request $request, Product $product): JsonResponse
    {
        abort_unless($request->user()->can('catalog.recipes.view'), 403);

        try {
            return response()->json($this->costing->costBreakdown($product));
        } catch (CircularRecipeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    private function validated(Request $request, bool $updating = false): array
    {
        return $request->validate([
            'product_id' => [$updating ? 'sometimes' : 'required', 'string', 'exists:products,id'],
            'yield_unit_id' => [$updating ? 'sometimes' : 'required', 'string', 'exists:units,id'],
            'name' => [$updating ? 'sometimes' : 'required', 'string', 'max:160'],
            'yield_quantity' => ['sometimes', 'numeric', 'min:0.0001'],
            'process_waste_percent' => ['sometimes', 'numeric', 'min:0', 'max:99.9999'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'items' => [$updating ? 'sometimes' : 'required', 'array', 'min:1'],
            'items.*.component_product_id' => ['required', 'string', 'exists:products,id'],
            'items.*.unit_id' => ['required', 'string', 'exists:units,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.0001'],
            'items.*.waste_percent' => ['nullable', 'numeric', 'min:0', 'max:99.9999'],
            'items.*.notes' => ['nullable', 'string'],
        ]);
    }
}
