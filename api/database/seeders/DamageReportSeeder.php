<?php

namespace Database\Seeders;

use App\Models\DamageReport;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class DamageReportSeeder extends Seeder
{
    public function run(): void
    {
        $samples = [
            [
                'reference' => 'DR-2041',
                'reporter_name' => 'Emma Müller',
                'reporter_email' => 'emma@example.com',
                'vehicle_registration' => 'AB-123-CD',
                'vehicle_make' => 'Volkswagen',
                'vehicle_model' => 'Golf 2021',
                'location' => 'Amsterdam, Zuidas',
                'incident_at' => CarbonImmutable::parse('2026-05-08 09:14'),
                'cover_image_url' => 'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?auto=format&fit=crop&w=1200&q=70',
                'damage_type' => 'collision',
                'severity' => 'moderate',
                'description' => 'Rear-end collision on the parking ramp. Bumper cracked, taillight damaged.',
                'estimated_cost' => 1840.00,
                'status' => 'reviewing',
            ],
            [
                'reference' => 'DR-2040',
                'reporter_name' => 'Bram de Vries',
                'reporter_email' => 'bram@example.com',
                'vehicle_registration' => 'XY-99-ZZ',
                'vehicle_make' => 'Tesla',
                'vehicle_model' => 'Model 3 2023',
                'location' => 'Utrecht, Centrum',
                'incident_at' => CarbonImmutable::parse('2026-05-07 17:42'),
                'cover_image_url' => 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=70',
                'damage_type' => 'scratch',
                'severity' => 'minor',
                'description' => 'Long scratch along the rear quarter panel from a shopping cart.',
                'estimated_cost' => 220.00,
                'status' => 'approved',
            ],
            [
                'reference' => 'DR-2039',
                'reporter_name' => 'Carlos Mendez',
                'reporter_email' => 'carlos@example.com',
                'vehicle_registration' => 'PL-77-ER',
                'vehicle_make' => 'Ford',
                'vehicle_model' => 'Focus 2019',
                'location' => 'Rotterdam, A20',
                'incident_at' => CarbonImmutable::parse('2026-05-07 08:00'),
                'cover_image_url' => 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=70',
                'damage_type' => 'collision',
                'severity' => 'severe',
                'description' => 'Highway side-swipe. Driver-side panels and mirror damaged.',
                'estimated_cost' => 3120.00,
                'status' => 'submitted',
            ],
            [
                'reference' => 'DR-2038',
                'reporter_name' => 'Hanna Janssen',
                'reporter_email' => 'hanna@example.com',
                'vehicle_registration' => 'BD-04-MM',
                'vehicle_make' => 'BMW',
                'vehicle_model' => 'X1 2022',
                'location' => 'Den Haag, Centrum',
                'incident_at' => CarbonImmutable::parse('2026-05-05 11:00'),
                'cover_image_url' => 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=70',
                'damage_type' => 'dent',
                'severity' => 'minor',
                'description' => 'Door ding from a neighbouring vehicle in an underground garage.',
                'estimated_cost' => 380.00,
                'status' => 'repaired',
            ],
        ];

        foreach ($samples as $row) {
            DamageReport::updateOrCreate(['reference' => $row['reference']], $row);
        }
    }
}
