ISWAS_v17.2 — STATIC RELEASE

Extract these contents into the web server's chosen site folder. Preserve all relative paths.
Use an HTTP(S) static server; opening index.html directly as a file is not supported.
The same files support a site at the domain root or in a version subfolder.
No build step or external Grok runtime is required. Browser WebGL is required for the 3D gallery.

Validation checks literal local asset paths, JavaScript syntax when Node is available,
required Morgan and globe modules, all 100 local book covers, all six lodge material maps,
three map texture tiers, and 200 valid location records. Dynamic URL expressions cannot
be exhaustively checked by static analysis; visual/browser verification remains necessary.

The source workspace retains version history, source images, provenance, and tools.
This deployment archive excludes those documents, Git data, and unused replaced image originals.
Any existing license/notice files are retained. No deployment is performed by packaging.
