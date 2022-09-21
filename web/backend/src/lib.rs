use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn boot() {
	console_error_panic_hook::set_once();
	console_log::init_with_level(log::Level::Debug).expect("logger already initialized");

	log::info!("Hello, World! This is a test of Parcel caching.");
}
