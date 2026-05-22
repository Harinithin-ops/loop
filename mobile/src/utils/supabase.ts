import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ztxwiifetmyrfrxphcdb.supabase.co";
const supabaseAnonKey = "sb_publishable_8j0CdyiwRHhjKixxsFqdSQ_EEws6LgD";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
