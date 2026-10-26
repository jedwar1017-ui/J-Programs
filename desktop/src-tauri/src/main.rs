// Growth OS desktop: a thin Windows window around the unchanged J-Programs web app.
// No local server, no remote pages, no file-system or shell access from the page.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{webview::DownloadEvent, Manager, WebviewUrl, WebviewWindowBuilder};

// Links that leave the app (GitHub repos, CI runs) open in the user's normal browser
// instead of inside the app window. Only https links are allowed (see capabilities).
const OPEN_LINKS_IN_BROWSER: &str = r#"
document.addEventListener('click', function (event) {
  var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
  if (!link || link.hasAttribute('download')) return;
  var url;
  try { url = new URL(link.href, location.href); } catch (e) { return; }
  if (url.protocol !== 'https:' || url.origin === location.origin) return;
  event.preventDefault();
  window.__TAURI_INTERNALS__.invoke('plugin:opener|open_url', { url: url.href }).catch(function () {});
}, true);
"#;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Growth OS — J-Programs")
                .inner_size(1180.0, 820.0)
                .min_inner_size(360.0, 560.0)
                .initialization_script(OPEN_LINKS_IN_BROWSER)
                // Export backup / weekly review: save into the user's Downloads folder.
                .on_download(|webview, event| {
                    if let DownloadEvent::Requested { destination, .. } = event {
                        if let (Ok(dir), Some(name)) =
                            (webview.path().download_dir(), destination.file_name().map(|n| n.to_owned()))
                        {
                            *destination = dir.join(name);
                        }
                    }
                    true
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Growth OS failed to start");
}
