# Bundled libraries (so the phone app works with no signal)

These files used to load from a CDN, which fails with no signal. They are served from our own site and saved on the phone.

| File | Package | Version |
| --- | --- | --- |
| jszip.min.js | jszip | 3.10.1 |
| jspdf.umd.min.js | jspdf | 2.5.1 |
| tesseract/tesseract.min.js, worker.min.js | tesseract.js | 5.1.1 |
| tesseract/tesseract-core-*lstm.wasm.js | tesseract.js-core | 5.1.0 |
| tesseract/lang/eng.traineddata.gz | @tesseract.js-data/eng | 1.0.0 (4.0.0 model) |

jszip and jspdf are saved with the app automatically. The tesseract files (about 19 MB) are saved the first time the phone is online, in the background, so the room-label scan also works offline. To update a library, replace the file and bump this table.
