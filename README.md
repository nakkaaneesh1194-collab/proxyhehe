<div align="center">
  
  <img src="https://github.com/DogeNetwork/dogeub/blob/main/public/logo.svg" width="322" />
  <br />

  [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/I3I81MF4CH) ![](https://dcbadge.limes.pink/api/server/https://discord.gg/unblocking?compact=true)


  <hr />
  DogeUB version 5 is finally here!

  
  <br />
  <br />

  <img width="1278" height="628" alt="image" src="preview.png" />


</div>

## Overview

DogeUB is a browser-in-browser style internet hub that brings together web apps, tools, and games in one place, built with [React](https://github.com/facebook/react).

> [!IMPORTANT]
> Please consider starring our repository if you are forking it!

### List of features:

| Feature | Implemented |
|---------|-------------|
| Web Proxy | Yes |
| Browser-like UI | Yes |
| App player UI | Yes |
| Cloak features | Partially |
| Game Downloader | Yes |
| Quick Links | Yes |
| DuckDuckGo Search API | Yes |
| Apps & Games | Yes |
| Search Engine Switcher | Yes |
| Themes/Site Customization | Yes |

---

### Development & Building

#### Production:
```bash
git clone https://github.com/DogeNetwork/dogeub.git
cd dogeub
npm i
npm run build
node server.js
```

#### Development:

```bash
git clone https://github.com/DogeNetwork/dogeub.git
cd dogeub
npm i
npm run dev
```
---


### Troubleshooting (Codespaces / CAPTCHA / "Robot" detections)

If you run DogeUB inside **GitHub Codespaces**, some sites may repeatedly show bot checks or a reCAPTCHA spinner that never finishes.

Common reasons:
- **Datacenter IP reputation**: Codespaces egress IPs are often flagged by anti-bot systems.
- **Strict browser integrity checks**: Some providers detect proxy/service-worker flows and block challenge completion.
- **Cookie/storage restrictions**: CAPTCHA flows can fail if required storage/cookies are blocked or partitioned.
- **TLS / origin issues**: Make sure you are using the HTTPS URL provided by Codespaces port forwarding.

What to try:
1. Open the app from the forwarded **HTTPS** Codespaces URL (not plain localhost in another device/browser).
2. In Codespaces Port Forwarding, set the app port visibility to **Public** (or required mode for your usage).
3. Test in a clean browser profile with extensions/ad blockers disabled.
4. If CAPTCHA still loops, run on a different host/network with better IP reputation (self-hosted VPS/reverse proxy or local network).

> [!IMPORTANT]
> Some anti-bot pages are intentionally difficult or impossible to complete through proxy contexts. This is an upstream site security behavior, not always a build/runtime bug in DogeUB.

#### Deploying with Docker:

```bash
docker run -d \
  --name dogeub \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  ghcr.io/dogenetwork/dogeub:latest
```

> [!NOTE]
> If accessing over a network instead of localhost, you will need to provide a valid SSL certificate (e.g., using a reverse proxy like Nginx or Caddy). This is required for the built-in service worker to function properly.

---

### Contributors / Developers

| Name          | Role               | GitHub |
| ------------- | ------------------ | ------ |
| Derpman | Lead Developer     |      [@qerionx](https://github.com/qerionx) |
| Fowntain | Project Manager | [@fowntain](https://github.com/fowntain)     |
| Akane | Contributor | [@genericness](https://github.com/genericness)     |
| DJshelfmushroom | Contributor | [@DJshelfmushroom](https://github.com/DJshelfmushroom)     |


> [!NOTE]
> Want to be on this list? Make a few pull requests!

---

### Made possible thanks to:

* [MercuryWorkshop/wisp-server-node](https://github.com/MercuryWorkshop/wisp-server-node)
* [MercuryWorkshop/scramjet](https://github.com/MercuryWorkshop/scramjet)
* [titaniumnetwork-dev/Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet)
* [lucide-icons/lucide](https://github.com/lucide-icons/lucide)
* [pmndrs/zustand](https://github.com/pmndrs/zustand)
* [Stuk/jszip](https://github.com/Stuk/jszip)

## License

This project is licensed under the **GNU Affero GPL v3**.  
See the [LICENSE](LICENSE) file for more details.
