<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('badge_number')->nullable()->after('email');
            $table->string('phone')->nullable()->after('badge_number');
            $table->string('role')->default('satpam')->after('phone'); // superadmin, admin, danru, satpam
            $table->string('avatar')->nullable()->after('role');
            $table->boolean('is_active')->default(true)->after('avatar');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['badge_number', 'phone', 'role', 'avatar', 'is_active']);
        });
    }
};
