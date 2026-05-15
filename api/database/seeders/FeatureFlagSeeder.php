<?php

namespace Database\Seeders;

use App\Models\FeatureFlag;
use Illuminate\Database\Seeder;

class FeatureFlagSeeder extends Seeder
{
    public function run(): void
    {
        $flags = [
            [
                'key' => 'report-photos',
                'name' => 'Report photo uploads',
                'description' => 'Allow customers to attach photos to a damage report.',
                'enabled' => true,
                'default_value' => true,
                'rules' => [],
            ],
            [
                'key' => 'cost-estimate',
                'name' => 'Inline repair cost estimate',
                'description' => 'Show an indicative repair cost on the report detail page.',
                'enabled' => true,
                'default_value' => true,
                'rules' => [],
            ],
            [
                'key' => 'ai-damage-analysis',
                'name' => 'AI damage analysis (beta)',
                'description' => 'QA cohort always-on; everyone else falls into a 35% rollout.',
                'enabled' => true,
                'default_value' => false,
                'rules' => [
                    [
                        'type' => 'user_targeting',
                        'user_keys' => ['qa.alice@example.com', 'qa.bob@example.com'],
                        'result' => true,
                    ],
                    [
                        'type' => 'percentage_rollout',
                        'percentage' => 35,
                        'salt' => 'ai-damage-analysis',
                        'result' => true,
                    ],
                ],
            ],
            [
                'key' => 'bulk-actions',
                'name' => 'Bulk delete reports',
                'description' => 'Bulk-delete is staff-only — gated by an attribute rule on role.',
                'enabled' => true,
                'default_value' => false,
                'rules' => [
                    [
                        'type' => 'attribute',
                        'attribute' => 'role',
                        'operator' => 'in',
                        'value' => ['staff', 'admin'],
                        'result' => true,
                    ],
                ],
            ],
            [
                'key' => 'export-pdf',
                'name' => 'Export report as PDF',
                'description' => 'Allow exporting a single report to PDF.',
                'enabled' => true,
                'default_value' => true,
                'rules' => [],
            ],
            [
                'key' => 'maintenance-banner',
                'name' => 'Maintenance banner',
                'description' => 'Show a sitewide banner during scheduled downtime.',
                'enabled' => false,
                'default_value' => true,
                'rules' => [],
            ],
        ];

        foreach ($flags as $f) {
            FeatureFlag::updateOrCreate(['key' => $f['key']], $f);
        }
    }
}
