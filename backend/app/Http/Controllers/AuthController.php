<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $r)
    {
        $data = $r->validate(['name' => 'required|string|max:100', 'email' => 'required|email|max:255|unique:users', 'password' => ['required', 'confirmed', PasswordRule::min(10)->letters()->numbers()]]);
        $user = User::create($data + ['role' => 'doctor', 'status' => 'active']);
        Auth::guard('web')->login($user);
        $r->session()->regenerate();

        return response()->json($user, 201);
    }

    public function login(Request $r)
    {
        $data = $r->validate(['email' => 'required|email', 'password' => 'required|string']);
        if (! Auth::guard('web')->attempt($data + ['status' => 'active'])) {
            throw ValidationException::withMessages(['email' => 'The credentials are incorrect or the account is inactive.']);
        }
        $r->session()->regenerate();

        return $r->user();
    }

    public function logout(Request $r)
    {
        Auth::guard('web')->logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();

        return response()->json(['message' => 'Signed out.']);
    }

    public function profile(Request $r)
    {
        $data = $r->validate(['name' => 'required|string|max:100', 'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($r->user()->id)]]);
        $r->user()->update($data);

        return $r->user()->fresh();
    }

    public function changePassword(Request $r)
    {
        $data = $r->validate(['current_password' => 'required|current_password:web', 'password' => ['required', 'confirmed', PasswordRule::min(10)->letters()->numbers()]]);
        $r->user()->update(['password' => $data['password'], 'remember_token' => Str::random(60)]);
        DB::table('sessions')->where('user_id', $r->user()->id)->where('id', '!=', $r->session()->getId())->delete();
        $r->user()->tokens()->delete();
        $r->session()->regenerate();

        return ['message' => 'Password updated. Other sessions have been signed out.'];
    }

    public function forgot(Request $r)
    {
        $r->validate(['email' => 'required|email']);
        Password::sendResetLink($r->only('email'));

        return ['message' => 'If an account exists for this email, a password reset link has been sent.'];
    }

    public function reset(Request $r)
    {
        $r->validate(['token' => 'required|string', 'email' => 'required|email', 'password' => ['required', 'confirmed', PasswordRule::min(10)->letters()->numbers()]]);
        $status = Password::reset($r->only('email', 'password', 'password_confirmation', 'token'), function (User $user, string $password) {
            $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
            DB::table('sessions')->where('user_id', $user->id)->delete();
            $user->tokens()->delete();
            event(new PasswordReset($user));
        });
        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => __($status)]);
        }

        return ['message' => __($status)];
    }
}
