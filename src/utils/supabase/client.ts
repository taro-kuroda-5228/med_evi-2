import { createBrowserClient } from '@supabase/ssr';

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// 必要に応じて、以下のようなサーバーサイド用のクライアントも定義できます
// import { createServerClient, type CookieOptions } from '@supabase/ssr';
// import { cookies } from 'next/headers';

// export const createServerSideClient = (
//   cookiesStore: ReturnType<typeof cookies>
// ) => {
//   return createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         get(name: string) {
//           return cookiesStore.get(name)?.value;
//         },
//         set(name: string, value: string, options: CookieOptions) {
//           cookiesStore.set({ name, value, ...options });
//         },
//         remove(name: string, options: CookieOptions) {
//           cookiesStore.set({ name, value: '', ...options });
//         },
//       },
//     }
//   );
// };
