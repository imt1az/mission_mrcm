<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureActive
{
    public function handle(Request $request, Closure $next)
    {
        abort_unless($request->user()?->status === 'active', 403, 'Your account is inactive. Please contact the administrator.');

        return $next($request);
    }
}
