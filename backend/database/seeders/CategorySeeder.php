<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        // Item categories
        $itemCategories = [
            ['name' => 'HVAC', 'icon' => 'thermometer', 'color' => '#3B82F6'],
            ['name' => 'Plumbing', 'icon' => 'droplet', 'color' => '#06B6D4'],
            ['name' => 'Electrical', 'icon' => 'zap', 'color' => '#F59E0B'],
            ['name' => 'Appliances', 'icon' => 'home', 'color' => '#8B5CF6'],
            ['name' => 'Roofing', 'icon' => 'cloud', 'color' => '#6B7280'],
            ['name' => 'Landscaping', 'icon' => 'tree', 'color' => '#22C55E'],
            ['name' => 'Security', 'icon' => 'shield', 'color' => '#EF4444'],
            ['name' => 'Pool/Spa', 'icon' => 'waves', 'color' => '#0EA5E9'],
            ['name' => 'Garage', 'icon' => 'car', 'color' => '#64748B'],
            ['name' => 'General', 'icon' => 'wrench', 'color' => '#71717A'],
        ];

        foreach ($itemCategories as $category) {
            Category::create([
                'household_id' => null,
                'type' => 'item',
                'name' => $category['name'],
                'icon' => $category['icon'],
                'color' => $category['color'],
            ]);
        }

        // Vendor categories
        $vendorCategories = [
            ['name' => 'Plumber', 'icon' => 'droplet', 'color' => '#06B6D4'],
            ['name' => 'Electrician', 'icon' => 'zap', 'color' => '#F59E0B'],
            ['name' => 'HVAC Technician', 'icon' => 'thermometer', 'color' => '#3B82F6'],
            ['name' => 'Appliance Repair', 'icon' => 'wrench', 'color' => '#8B5CF6'],
            ['name' => 'General Contractor', 'icon' => 'hammer', 'color' => '#71717A'],
            ['name' => 'Landscaper', 'icon' => 'tree', 'color' => '#22C55E'],
            ['name' => 'Roofer', 'icon' => 'cloud', 'color' => '#6B7280'],
            ['name' => 'Security Installer', 'icon' => 'shield', 'color' => '#EF4444'],
            ['name' => 'Pool Service', 'icon' => 'waves', 'color' => '#0EA5E9'],
            ['name' => 'Other', 'icon' => 'user', 'color' => '#64748B'],
        ];

        foreach ($vendorCategories as $category) {
            Category::create([
                'household_id' => null,
                'type' => 'vendor',
                'name' => $category['name'],
                'icon' => $category['icon'],
                'color' => $category['color'],
            ]);
        }
    }
}
