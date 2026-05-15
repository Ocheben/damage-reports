<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Trusted attributes — server reads these into EvaluationContext.
            // Strings rather than enums so adding "marketing" or "qa" is data,
            // not a schema change.
            $table->string('role', 32)->default('customer')->index();
            $table->string('country', 2)->default('NL');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'country']);
        });
    }
};
