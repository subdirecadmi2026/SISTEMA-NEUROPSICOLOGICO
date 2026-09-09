<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\InventoryBehavior;
use App\Enums\ProductStatus;
use App\Enums\ProductType;
use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('catalog.products.view'), 403);

        $query = Product::query()
            ->with(['category', 'baseUnit', 'taxRate', 'activeRecipe'])
            ->orderBy('name');

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->string('category_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->boolean('sellable')) {
            $query->where('is_sellable', true)->where('status', 'active');
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate(50));
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('catalog.products.manage'), 403);

        $data = $this->validated($request);
        unset($data['image']);
        $data['company_id'] = $request->user()->company_id;
        $product = Product::query()->create($data);

        $this->syncRelations($product, $request);
        $this->storeImage($request, $product);

        return response()->json($this->fresh($product), 201);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        abort_unless($request->user()->can('catalog.products.view'), 403);

        return response()->json($this->fresh($product));
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        abort_unless($request->user()->can('catalog.products.manage'), 403);

        $data = $this->validated($request, $product->id);
        unset($data['image']);
        $product->update($data);
        $this->syncRelations($product, $request);
        $this->storeImage($request, $product);

        return response()->json($this->fresh($product));
    }

    public function uploadImage(Request $request, Product $product): JsonResponse
    {
        abort_unless($request->user()->can('catalog.products.manage'), 403);
        $request->validate([
            'image' => ['required', 'file', 'image', 'max:4096', 'mimes:jpeg,jpg,png,webp,gif'],
        ]);
        $this->storeImage($request, $product);

        return response()->json($this->fresh($product));
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        abort_unless($request->user()->can('catalog.products.manage'), 403);

        $product->delete();

        return response()->json(status: 204);
    }

    private function fresh(Product $product): Product
    {
        return $product->fresh([
            'category',
            'baseUnit',
            'purchaseUnit',
            'taxRate',
            'kitchenStation',
            'optionGroups.options',
            'variants',
            'comboItems.component',
            'channelPrices',
            'branchSettings',
            'availabilityWindows',
            'activeRecipe.items',
        ]);
    }

    private function syncRelations(Product $product, Request $request): void
    {
        if ($request->has('channel_prices')) {
            $product->channelPrices()->delete();
            foreach ($request->input('channel_prices', []) as $row) {
                $product->channelPrices()->create($row);
            }
        }

        if ($request->has('combo_items')) {
            $product->comboItems()->delete();
            foreach ($request->input('combo_items', []) as $index => $row) {
                $product->comboItems()->create($row + ['sort_order' => $index]);
            }
        }

        if ($request->has('option_groups')) {
            $product->optionGroups()->each(fn ($group) => $group->options()->delete());
            $product->optionGroups()->delete();

            foreach ($request->input('option_groups', []) as $index => $groupData) {
                $options = $groupData['options'] ?? [];
                unset($groupData['options']);
                $group = $product->optionGroups()->create($groupData + ['sort_order' => $index]);

                foreach ($options as $optIndex => $option) {
                    $group->options()->create($option + ['sort_order' => $optIndex]);
                }
            }
        }
    }

    private function validated(Request $request, ?string $ignoreId = null): array
    {
        return $request->validate([
            'category_id' => ['nullable', 'string', 'exists:categories,id'],
            'base_unit_id' => ['required', 'string', 'exists:units,id'],
            'purchase_unit_id' => ['nullable', 'string', 'exists:units,id'],
            'tax_rate_id' => ['nullable', 'string', 'exists:tax_rates,id'],
            'kitchen_station_id' => ['nullable', 'string', 'exists:kitchen_stations,id'],
            'type' => ['required', Rule::enum(ProductType::class)],
            'status' => ['sometimes', Rule::enum(ProductStatus::class)],
            'inventory_behavior' => ['sometimes', Rule::enum(InventoryBehavior::class)],
            'name' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string'],
            'sku' => [
                'nullable',
                'string',
                'max:64',
                Rule::unique('products', 'sku')->where('company_id', $request->user()->company_id)->ignore($ignoreId),
            ],
            'barcode' => ['nullable', 'string', 'max:64'],
            'image_path' => ['nullable', 'string', 'max:255'],
            'default_cost' => ['nullable', 'numeric', 'min:0'],
            'default_price' => ['nullable', 'numeric', 'min:0'],
            'prep_time_minutes' => ['nullable', 'integer', 'min:0'],
            'tracks_lots' => ['sometimes', 'boolean'],
            'is_sellable' => ['sometimes', 'boolean'],
            'is_purchasable' => ['sometimes', 'boolean'],
            'allergens' => ['nullable', 'array'],
            'channel_prices' => ['sometimes', 'array'],
            'combo_items' => ['sometimes', 'array'],
            'option_groups' => ['sometimes', 'array'],
            'image' => ['sometimes', 'file', 'image', 'max:4096', 'mimes:jpeg,jpg,png,webp,gif'],
        ]);
    }

    private function storeImage(Request $request, Product $product): void
    {
        if (! $request->hasFile('image')) {
            return;
        }

        $file = $request->file('image');
        $name = $product->id.'.'.strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $file->storeAs('products', $name, 'public');
        $product->update(['image_path' => 'products/'.$name]);
    }
}
