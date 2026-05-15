<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('damage_reports', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->string('reporter_name');
            $table->string('reporter_email');
            $table->string('vehicle_registration');
            $table->string('vehicle_make')->nullable();
            $table->string('vehicle_model')->nullable();
            $table->string('location')->nullable();
            $table->timestamp('incident_at')->nullable();
            $table->string('cover_image_url', 1024)->nullable();
            $table->string('damage_type');
            $table->string('severity');
            $table->text('description');
            $table->json('photos')->nullable();
            $table->decimal('estimated_cost', 10, 2)->nullable();
            $table->string('status')->default('submitted');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('damage_reports');
    }
};
