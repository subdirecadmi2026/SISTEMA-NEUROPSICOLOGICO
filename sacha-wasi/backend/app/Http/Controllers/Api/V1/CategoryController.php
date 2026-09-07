<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('catalog.categories.view'), 403);

        $query = Category::query()
            ->with(['children' => fn ($q) => $q->orderBy('sort_order')])
            ->withCount('products')
            ->orderBy('sort_order')
            ->orderBy('name');

        if ($request->boolean('roots_only', true)) {
            $query->whereNull('parent_id');
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('catalog.categories.manage'), 403);

        $data = $this->validated($request);
        $data['company_id'] = $request->user()->company_id;
        $data['slug'] ??= Str::slug($data['name']).'-'.Str::lower(Str::random(4));

        $category = Category::query()->create($data);

        return response()->json($category, 201);
    }

    public function show(Request $request, Category $category): JsonResponse
    {
        abort_unless($request->user()->can('catalog.categories.view'), 403);

        return response()->json($category->load(['parent', 'children', 'products']));
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        abort_unless($request->user()->can('catalog.categories.manage'), 403);

        $category->update($this->validated($request, $category->id));

        return response()->json($category->fresh());
    }

    public function destroy(Request $request, Category $category): JsonResponse
    {
        abort_unless($request->user()->can('catalog.categories.manage'), 403);

        $category->delete();

        return response()->json(status: 204);
    }

    private function validated(Request $request, ?string $ignoreId = null): array
    {
        return $request->validate([
            'parent_id' => ['nullable', 'string', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:120'],
            'slug' => [
                'nullable',
                'string',
                'max:140',
                Rule::unique('categories', 'slug')->where('company_id', $request->user()->company_id)->ignore($ignoreId),
            ],
            'image_path' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:16'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'show_on_pos' => ['sometimes', 'boolean'],
            'show_on_qr_menu' => ['sometimes', 'boolean'],
        ]);
    }
}
