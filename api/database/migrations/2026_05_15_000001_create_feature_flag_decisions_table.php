<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feature_flag_decisions', function (Blueprint $table) {
            $table->id();
            $table->string('flag_key', 128);
            $table->boolean('result');
            $table->string('reason', 64);
            $table->string('user_key', 255)->nullable();
            $table->json('attributes')->nullable();
            $table->timestamp('decided_at')->useCurrent();

            // Common admin queries: "decisions for flag X, newest first" and
            // "decisions in the last N hours". A composite covers both.
            $table->index(['flag_key', 'decided_at']);
            $table->index('decided_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feature_flag_decisions');
    }
};
