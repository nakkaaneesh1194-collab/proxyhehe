import { mango } from './of.js';

const check = (inp, engine) => {
  const trimmed = inp.trim();
  if (!trimmed) return '';

  const isUrl =
    /^https?:\/\//i.test(trimmed) ||
    /^[\w-]+\.[\w.-]+/i.test(trimmed) ||
    trimmed.startsWith('localhost');

  if (isUrl) {
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  } else {
    return engine + encodeURIComponent(trimmed);
  }
};


export const process = (input, decode = false, prType, engine = "https://www.google.com/search?q=") => {
  const upwefix = isStaticBuild 
    ? new URL('./portal/k12/', location.href).pathname
    : '/portal/k12/';
  const eggowaffle = isStaticBuild
    ? new URL('./ham/', location.href).pathname
    : '/ham/';
  
  let prefix;

  const uvSites = ['youtube.com', 'youtu.be'];
  const finalUrl = check(input, engine);
  const forceUV = uvSites.some(site => finalUrl.includes(site));

  switch (prType) {
    case 'uv':
      prefix = upwefix;
      break;
    case 'scr':
      prefix = forceUV ? upwefix : eggowaffle;
      break;
    default:
      prefix = forceUV ? upwefix : eggowaffle;
  }

  if (decode) {
    const uvPart = input.split(upwefix)[1];
    const scrPart = input.split(eggowaffle)[1];
    const decoded = uvPart ? mango.dnc(uvPart) : scrPart ? mango.dnc(scrPart) : input;
    return decoded.endsWith('/') ? decoded.slice(0, -1) : decoded;
  } else {
    const final = check(input, engine);
    if (!final || final.trim() === '') {
      return null;
    }
    const encoded = prefix === eggowaffle ? mango.enc(final) : mango.enc(final);
    return `${location.protocol}//${location.host}${prefix}${encoded}`;
  }
};

export function openEmbed(url) {
  var win = window.open();
  win.document.body.style.margin = "0";
  win.document.body.style.height = "100vh";
  var iframe = win.document.createElement("iframe");
  iframe.style.border = "none";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.margin = "0";
  iframe.src = url;
  win.document.body.appendChild(iframe);
}