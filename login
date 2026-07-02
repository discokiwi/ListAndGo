

<!DOCTYPE html><html class="light" lang="en"><head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0, viewport-fit=cover" name="viewport">
<title>Log In - List&amp;GO</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet">
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "on-tertiary": "#ffffff",
                    "error": "#ba1a1a",
                    "surface-container-highest": "#e2e2e5",
                    "surface-variant": "#e2e2e5",
                    "on-surface-variant": "#404943",
                    "tertiary-fixed": "#ffdad9",
                    "error-container": "#ffdad6",
                    "outline-variant": "#bfc9c1",
                    "on-secondary-fixed": "#111f0f",
                    "surface-muted": "#EEF1EF",
                    "inverse-primary": "#95d4b3",
                    "primary-fixed": "#b1f0ce",
                    "secondary": "#53634e",
                    "primary-container": "#2d6a4f",
                    "text-dimmed": "#636E72",
                    "surface-soft": "#F8F9F8",
                    "on-error-container": "#93000a",
                    "on-surface": "#1a1c1e",
                    "on-tertiary-fixed-variant": "#6f3537",
                    "on-primary-fixed-variant": "#0e5138",
                    "surface-container-low": "#f3f3f6",
                    "surface-bright": "#f9f9fc",
                    "on-secondary": "#ffffff",
                    "tertiary-fixed-dim": "#ffb3b3",
                    "secondary-container": "#d3e5cb",
                    "tertiary": "#713638",
                    "outline": "#707973",
                    "primary-fixed-dim": "#95d4b3",
                    "on-primary-container": "#a8e7c5",
                    "on-tertiary-container": "#ffcfce",
                    "background": "#f9f9fc",
                    "surface-container": "#eeeef0",
                    "inverse-surface": "#2f3133",
                    "on-error": "#ffffff",
                    "success-light": "#D8E2DC",
                    "on-tertiary-fixed": "#390b0e",
                    "surface-container-high": "#e8e8ea",
                    "tertiary-container": "#8d4d4e",
                    "on-background": "#1a1c1e",
                    "inverse-on-surface": "#f0f0f3",
                    "on-secondary-container": "#576752",
                    "surface-tint": "#2c694e",
                    "surface-dim": "#dadadc",
                    "on-secondary-fixed-variant": "#3b4b38",
                    "surface": "#f9f9fc",
                    "on-primary-fixed": "#002114",
                    "primary": "#0f5238",
                    "secondary-fixed": "#d6e8ce",
                    "surface-container-lowest": "#ffffff",
                    "surface-pure": "#FFFFFF",
                    "secondary-fixed-dim": "#baccb3",
                    "on-primary": "#ffffff"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "base": "8px",
                    "safe-margin": "20px",
                    "list-item-gap": "12px",
                    "gutter": "16px",
                    "thumb-touch": "48px"
            },
            "fontFamily": {
                    "body-reg": ["Hanken Grotesk"],
                    "badge-caps": ["Hanken Grotesk"],
                    "item-name": ["Hanken Grotesk"],
                    "display-lg": ["Hanken Grotesk"],
                    "headline-md": ["Hanken Grotesk"],
                    "unit-label": ["Hanken Grotesk"]
            },
            "fontSize": {
                    "body-reg": ["16px", {"lineHeight": "1.5", "fontWeight": "400"}],
                    "badge-caps": ["12px", {"lineHeight": "1", "letterSpacing": "0.05em", "fontWeight": "700"}],
                    "item-name": ["18px", {"lineHeight": "1.4", "fontWeight": "600"}],
                    "display-lg": ["32px", {"lineHeight": "1.2", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                    "headline-md": ["24px", {"lineHeight": "1.3", "fontWeight": "600"}],
                    "unit-label": ["14px", {"lineHeight": "1.2", "letterSpacing": "0.01em", "fontWeight": "400"}]
            }
          },
        },
      }
    </script>
<style>
      body {
        font-family: 'Hanken Grotesk', sans-serif;
        -webkit-tap-highlight-color: transparent;
      }
      .material-symbols-outlined {
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      }
      .thumb-zone-gradient {
        background: linear-gradient(180deg, rgba(248, 249, 248, 0) 0%, rgba(248, 249, 248, 1) 100%);
      }
    </style>
</head>
<body class="bg-surface-soft text-on-surface min-h-screen flex flex-col">
<!-- TopAppBar Navigation Shell (Suppressed Nav, Only Header Actions) -->
<header class="bg-surface-soft dark:bg-surface-dim flex items-center px-safe-margin py-4 w-full top-0 z-50">
<button aria-label="Back" class="hover:opacity-80 active:scale-95 transition-transform p-2 -ml-2">
<span class="material-symbols-outlined text-primary dark:text-primary-fixed-dim">arrow_back</span>
</button>
<h1 class="font-headline-md text-headline-md text-primary dark:text-primary-fixed-dim ml-4">Log In</h1>
</header>
<main class="flex-grow flex flex-col px-safe-margin pt-8 pb-24">
<!-- Brand Visual Anchor -->
<div class="mb-12">
<h2 class="font-display-lg text-display-lg text-primary mb-2">Welcome Back.</h2>
<p class="font-body-reg text-body-reg text-on-surface-variant">Log in to sync your grocery lists and meal plans.</p>
</div>
<!-- Form Canvas -->
<form class="space-y-gutter flex flex-col" id="loginForm">
<!-- Email Input -->
<div class="space-y-2">
<label class="font-unit-label text-unit-label text-outline uppercase tracking-wider ml-1" for="email">Email Address</label>
<div class="relative">
<input class="w-full h-thumb-touch px-4 bg-surface-pure rounded-xl border-none shadow-[0_4px_20px_rgba(0,0,0,0.05)] focus:ring-2 focus:ring-primary-container transition-all placeholder:text-outline-variant font-body-reg text-body-reg" id="email" placeholder="e.g. alex@example.com" required="" type="email">
</div>
</div>
<!-- Password Input -->
<div class="space-y-2">
<div class="flex justify-between items-end px-1">
<label class="font-unit-label text-unit-label text-outline uppercase tracking-wider" for="password">Password</label>
<a class="font-unit-label text-unit-label text-primary hover:underline" href="#">Forgot Password?</a>
</div>
<div class="relative">
<input class="w-full h-thumb-touch px-4 bg-surface-pure rounded-xl border-none shadow-[0_4px_20px_rgba(0,0,0,0.05)] focus:ring-2 focus:ring-primary-container transition-all placeholder:text-outline-variant font-body-reg text-body-reg" id="password" placeholder="••••••••" required="" type="password">
<button class="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant" onclick="togglePassword()" type="button">
<span class="material-symbols-outlined" id="passIcon">visibility</span>
</button>
</div>
</div>
<!-- Contextual Graphic (Calm Efficiency) -->
<div class="py-8 opacity-60">
<div class="w-full h-40 rounded-3xl overflow-hidden shadow-sm">

</div>
</div>
<!-- Primary Actions (Thumb Zone Positioning) -->
<div class="mt-auto pt-8 space-y-4">
<button class="w-full h-thumb-touch bg-primary-container text-on-primary-container font-item-name text-item-name rounded-full shadow-[0_4px_20px_rgba(45,106,79,0.25)] active:scale-95 transition-all flex items-center justify-center gap-2" type="submit">
                    Log In
                    <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
</button>
<div class="text-center">
<p class="font-body-reg text-body-reg text-on-surface-variant">
                        Don't have an account? 
                        <a class="text-primary font-bold hover:underline" href="#">Create Account</a>
</p>
</div>
</div>
</form>
</main>
<!-- Visual Polish: Subtle Glass Detail -->
<div class="fixed bottom-0 left-0 right-0 h-4 thumb-zone-gradient pointer-events-none"></div>
<script>
        function togglePassword() {
            const passInput = document.getElementById('password');
            const passIcon = document.getElementById('passIcon');
            if (passInput.type === 'password') {
                passInput.type = 'text';
                passIcon.textContent = 'visibility_off';
            } else {
                passInput.type = 'password';
                passIcon.textContent = 'visibility';
            }
        }

        // Form feedback interaction
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span>';
            btn.disabled = true;
            
            setTimeout(() => {
                btn.innerHTML = 'Success';
                btn.classList.replace('bg-primary-container', 'bg-secondary');
                setTimeout(() => {
                    btn.innerHTML = originalContent;
                    btn.disabled = false;
                    btn.classList.replace('bg-secondary', 'bg-primary-container');
                }, 1500);
            }, 1000);
        });
    </script>


</body></html>