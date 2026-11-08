# Primary deployment target

Wondrej confirmed on 2026-11-08 that WondersLand [WL] will primarily run in a
browser on a domain. Treat the browser as the primary product delivery target
for subsequent work. The current requested revision continues the existing
native C++/Qt Quick application; it does not yet provide a browser build or
publish/replace the website on the repository's main branch.

Keep the JSON balance/progression configuration, English string keys, stable
IDs, exact satoshi decimal strings, and versioned progress schema portable.
Game simulation uses a fixed 640×360 logical world independent of display
size. A future browser client must use these same rules and migrations and
preserve keyboard/mouse parity and nearest-neighbour pixel rendering.

Before implementing browser delivery, choose and verify the client/runtime
(Qt WebAssembly versus a dedicated web client), persistence/import of native
progress, public mempool API connectivity/CORS, hosting route and domain.
No domain route, account backend, cross-device progress, browser runtime or
web deployment is implied by the current native build. Payments remain out
of scope. Do not silently substitute floating point BTC or change existing
progress identifiers during the port.
