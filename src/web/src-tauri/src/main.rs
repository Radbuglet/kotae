/*use window_vibrancy::{apply_blur, apply_vibrancy, NSVisualEffectMaterial};

#[cfg(target_os = "macos")]
apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None).expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");

#[cfg(target_os = "windows")]
apply_blur(&window, Some((18, 18, 18, 125))).expect("Unsupported platform! 'apply_blur' is only supported on Windows");
*/
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

fn main() {
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
