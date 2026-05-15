<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('flags:purge-decisions')->dailyAt('02:30');
