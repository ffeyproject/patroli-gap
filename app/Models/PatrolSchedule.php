<?php

namespace App\Models;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PatrolSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'site_id',
        'shift_name',
        'start_time',
        'end_time',
        'schedule_date',
        'min_patrol_rounds',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'schedule_date' => 'date',
            'min_patrol_rounds' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Jadwal yang mungkin berjalan sekarang: tanggal hari ini, atau tanggal kemarin
     * bila shift melewati tengah malam. Jadwal tanpa tanggal dianggap berulang tiap hari.
     */
    public function scopeRelevantAt(Builder $query, CarbonInterface|DateTimeInterface $now): Builder
    {
        $now = Carbon::parse($now);

        return $query->where(function (Builder $q) use ($now) {
            $q->whereNull('schedule_date')
                ->orWhereDate('schedule_date', $now->toDateString())
                ->orWhere(function (Builder $y) use ($now) {
                    $y->whereDate('schedule_date', $now->copy()->subDay()->toDateString())
                        ->whereColumn('end_time', '<=', 'start_time');
                });
        });
    }

    /** Rentang waktu shift sebenarnya [mulai, selesai]. */
    public function windowFor(CarbonInterface|DateTimeInterface $now): ?array
    {
        if (! $this->start_time || ! $this->end_time) {
            return null;
        }

        $now = Carbon::parse($now);
        $tz = $now->getTimezone();
        $date = $this->schedule_date
            ? $this->schedule_date->format('Y-m-d')
            : $now->toDateString();
        $start = Carbon::parse($date.' '.$this->start_time, $tz);
        $end = Carbon::parse($date.' '.$this->end_time, $tz);
        if ($end <= $start) {
            $end->addDay();
        }

        // Jadwal berulang (tanpa tanggal) yang melewati tengah malam: geser ke shift yang sedang berjalan.
        if (! $this->schedule_date && $now < $start && $now <= $end->copy()->subDay()) {
            $start->subDay();
            $end->subDay();
        }

        return [$start, $end];
    }

    public function isRunningAt(CarbonInterface|DateTimeInterface $now): bool
    {
        $window = $this->windowFor($now);

        return $window !== null && $now >= $window[0] && $now <= $window[1];
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'patrol_schedule_users');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(PatrolSession::class);
    }
}
