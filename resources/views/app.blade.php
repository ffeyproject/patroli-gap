<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <style>
            html, body {
                background-color: #070c18;
                color: #f8fafc;
                margin: 0;
                padding: 0;
            }
        </style>

        <link rel="icon" href="/images/logo.png" type="image/png">
        <link rel="apple-touch-icon" href="/images/logo.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Patroli Security - PT. Gajah Angkasa Perkasa') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased bg-[#070c18] text-slate-100 min-h-screen">
        <x-inertia::app />
    </body>
</html>
