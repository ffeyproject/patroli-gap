<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sites', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->integer('geofence_radius_meters')->default(50);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('checkpoints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->string('name');
            $table->string('code');
            $table->string('qr_token')->unique();
            $table->text('location_description')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->integer('max_radius_meters')->default(10); // Strict 10 meters default
            $table->integer('order_index')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('patrol_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->string('shift_name'); // Pagi, Siang, Malam
            $table->time('start_time');
            $table->time('end_time');
            $table->date('schedule_date')->nullable();
            $table->integer('min_patrol_rounds')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('patrol_schedule_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patrol_schedule_id')->constrained('patrol_schedules')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['patrol_schedule_id', 'user_id']);
        });

        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->dateTime('check_in_at');
            $table->dateTime('check_out_at')->nullable();
            $table->string('check_in_photo')->nullable();
            $table->decimal('check_in_lat', 10, 7)->nullable();
            $table->decimal('check_in_lng', 10, 7)->nullable();
            $table->string('status')->default('present'); // present, late, leave
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('patrol_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patrol_schedule_id')->nullable()->constrained('patrol_schedules')->nullOnDelete();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('round_number')->default(1);
            $table->dateTime('started_at');
            $table->dateTime('completed_at')->nullable();
            $table->string('status')->default('in_progress'); // in_progress, completed, incomplete
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('patrol_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patrol_session_id')->constrained('patrol_sessions')->cascadeOnDelete();
            $table->foreignId('checkpoint_id')->constrained('checkpoints')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->dateTime('scanned_at');
            $table->string('selfie_photo_path')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('distance_meters', 8, 2)->default(0);
            $table->boolean('is_valid_location')->default(true); // true if <= max_radius_meters (10m)
            $table->string('condition_status')->default('normal'); // normal, warning, danger
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('checkpoint_id')->nullable()->constrained('checkpoints')->nullOnDelete();
            $table->string('title');
            $table->text('description');
            $table->string('severity')->default('medium'); // low, medium, high, critical
            $table->string('photo_path')->nullable();
            $table->string('status')->default('open'); // open, investigating, resolved
            $table->dateTime('reported_at');
            $table->dateTime('resolved_at')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('visitors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); // Petugas yang menerima
            $table->string('guest_name');
            $table->string('company')->nullable();
            $table->string('destination');
            $table->string('purpose');
            $table->string('vehicle_number')->nullable();
            $table->string('id_photo_path')->nullable();
            $table->dateTime('check_in_at');
            $table->dateTime('check_out_at')->nullable();
            $table->string('status')->default('checked_in'); // checked_in, checked_out
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitors');
        Schema::dropIfExists('incidents');
        Schema::dropIfExists('patrol_logs');
        Schema::dropIfExists('patrol_sessions');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('patrol_schedule_users');
        Schema::dropIfExists('patrol_schedules');
        Schema::dropIfExists('checkpoints');
        Schema::dropIfExists('sites');
    }
};
