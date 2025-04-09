// ==UserScript==
// @name         KLMS-util-suite
// @namespace    https://klms.kaist.ac.kr/
// @version      1.1.0
// @description  A userscript suite of useful features for KAIST KLMS
// @match        https://klms.kaist.ac.kr/*
// @grant        GM_addStyle
// ==/UserScript==

// === Settings ===
const ENABLE_SESSION_AUTO_EXTEND = true;
const ENABLE_CUSTOM_COLOR_THEME = false;
const ENABLE_HIDE_NAME_AND_ID = true;
const ENABLE_FILE_PREVIEW_BUTTONS = true;

// Main color for color scheme
// Default KAIST: 'rgb(0, 65, 145)'
// POSTECH: 'rgb(200, 1, 80)'
// Rich red: 'rgb(186, 0, 0)'
const PRIMARY_COLOR = 'rgb(134, 0, 60)';

const PRIMARY_COLOR_DARK = darkenRGB(PRIMARY_COLOR, 0.25);
const PRIMARY_COLOR_DARKER = darkenRGB(PRIMARY_COLOR, 0.4);
const PRIMARY_COLOR_LIGHT = softenRGB(PRIMARY_COLOR, 30);

GM_addStyle(`
  .kus-placeholder-btn {
    color: white;
    border: none;
    padding: 6px 10px;
    cursor: pointer;
    border-radius: 10px;
  }

  .kus-preview-btn {
    background: none;
    border: none;
    padding: 3px;
    cursor: pointer;
    border-radius: 10px;
    margin-left: 8px;
  }

  .kus-loading-spinner {
    display: inline-block;
    animation: kus-spin 1s linear infinite;
  }

  @keyframes kus-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .kus-loading-indicator {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 20px;
    background: rgba(0,0,0,0.7);
    color: white;
    border-radius: 10px;
    z-index: 9999;
  }
`);

function kusLog(isSuccess, msg) {
  console.log("[KLMS-util-suite] " + (isSuccess ? "" : "Error: ") + msg);
}

function parseRGB(rgbString) {
  const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) {
    kusLog(false, `Could not parse RGB from: "${rgbString}"`);
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10)
  };
}

function darkenRGB(rgb, factor) {
  const { r, g, b } = parseRGB(rgb);
  const newR = Math.round(r * (1 - factor));
  const newG = Math.round(g * (1 - factor));
  const newB = Math.round(b * (1 - factor));
  return `rgb(${newR}, ${newG}, ${newB})`;
}

function softenRGB(rgbString, amount) {
  const match = rgbString.match(/\d+/g);
  if (!match) return rgbString;

  const [r, g, b] = match.map(n => Math.min(255, parseInt(n) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

function extractUrlFromOnclick(onclickAttr) {
  const match = onclickAttr.match(/downloadFile\('([^']+)',\s*'([^']+)/);
  if (match && match.length >= 2) {
    return match[1];
  }
  return null;
}

function isPdfFile(element) {
  // Check for PDF icon in the image src
  const icon = element.querySelector('img.iconlarge');
  if ((icon && icon.src && icon.src.includes('/f/pdf-')) || element.href.includes('.pdf')) {
    return true;
  }
  return false;
}

async function getRealFileUrl(fileUrl) {
  try {
    const response = await fetch(fileUrl, {
      method: 'GET',
      credentials: 'include',
    });

    return response.url;
  } catch (error) {
    kusLog(false, "Failed to get real file URL: " + error.message);
    return fileUrl;
  }
}

function createPreviewButton() {
  const previewBtn = document.createElement('button');
  previewBtn.className = 'kus-preview-btn';
  previewBtn.textContent = "🔎";

  return previewBtn;
}

function createLoadingSpinner() {
  const spinner = document.createElement('span');
  spinner.className = 'pdf-loading-spinner';
  spinner.textContent = "⌛";
  spinner.classList.add('kus-loading-spinner');

  return spinner;
}

async function openFilePreview(fileUrl) {
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'kus-loading-indicator';

  const spinner = createLoadingSpinner();
  loadingIndicator.appendChild(spinner);

  const loadingText = document.createElement('span');
  loadingText.textContent = " Loading PDF...";
  loadingText.style.marginLeft = '10px';
  loadingIndicator.appendChild(loadingText);

  document.body.appendChild(loadingIndicator);

  const realUrl = await getRealFileUrl(fileUrl);
  const cleanUrl = realUrl.replace(/\?forcedownload=1$/, '');

  const response = await fetch(cleanUrl, {
    credentials: 'include',
  });

  if (!response.ok) {
    kusLog(false, `Failed to fetch file: ${response.status}`);
    return;
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  const previewTab = window.open(blobUrl, '_blank');
  if (previewTab) {
    document.body.removeChild(loadingIndicator);
  }
}

// === Feature 1: Auto-Extend Session ===
function sessionAutoExtend() {
  setInterval(() => {
    const btn = [...document.querySelectorAll('.login-time a')].find(a => /연장|extend/i.test(a.textContent));
    if (btn) {
      btn.click();
      kusLog(true, "Extended login session");
    } else {
      kusLog(false, "Extend session button not found, cannot extend session");
    }
  }, 30 * 60 * 1000);
}

// === Feature 2: Color Scheme Customizer ===
function customColorTheme() {
  const mappings = [
    { from: 'rgb(0, 65, 145)', to: PRIMARY_COLOR },
    { from: 'rgb(0, 42, 92)', to: darkenRGB(PRIMARY_COLOR, 0.2) },
    { from: 'rgb(6, 42, 78)', to: darkenRGB(PRIMARY_COLOR, 0.3) },
    { from: 'rgb(31, 143, 206)', to: softenRGB(PRIMARY_COLOR, 30) },
  ];

  const elements = document.querySelectorAll('*');
  const properties = [
    'color',
    'backgroundColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'textDecorationColor',
  ];

  elements.forEach(el => {
    const style = getComputedStyle(el);

    properties.forEach(prop => {
      const currentColor = style[prop];
      if (!currentColor || currentColor === 'transparent' || currentColor === 'inherit') return;

      const currentRGB = parseRGB(currentColor);
      if (!currentRGB) return;

      let closestMatch = null;
      let minDistance = Infinity;

      for (const map of mappings) {
        const originalRGB = parseRGB(map.from);
        const dist = colorDistance(currentRGB, originalRGB);
        if (dist < minDistance) {
          minDistance = dist;
          closestMatch = map.to;
        }
      }

      const threshold = 50;
      if (minDistance <= threshold) {
        el.style.setProperty(
          prop.replace(/([A-Z])/g, '-$1').toLowerCase(),
          closestMatch,
          'important'
        );
      }
    });
  });

  kusLog(true, "Color scheme overridden (with closest color matching)");
}

// === Feature 3: Name/ID Hider ===
function hideNameAndId() {
  const userSelect = document.querySelector('.multi-users');
  if (userSelect) {
    userSelect.style.display = 'none';
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';

    const placeholder = document.createElement('button');
    placeholder.textContent = "Click to show ID/name";
    placeholder.className = 'kus-placeholder-btn';
    placeholder.style.background = ENABLE_CUSTOM_COLOR_THEME
      ? darkenRGB(PRIMARY_COLOR, 0.25)
    : 'rgb(0, 42, 92)';

    userSelect.style.display = 'none';

    placeholder.addEventListener('click', () => {
      placeholder.style.display = 'none';
      userSelect.style.display = '';
    });

    const parent = userSelect.parentNode;
    parent.insertBefore(wrapper, userSelect);
    wrapper.appendChild(placeholder);
    wrapper.appendChild(userSelect);

    kusLog(true, "Hid name and ID");
  } else {
    kusLog(false, "Name and ID not found, cannot hide");
  }
}

// === Feature 4: PDF Preview Buttons ===
function filePreviewButtons() {
  let previewButtonsAdded = 0;

  const fileLinks = document.querySelectorAll('a.aalink[href*="/mod/coursefile/view.php"]');
  fileLinks.forEach(link => {
    if (link.querySelector('.preview-btn')) return;
    if (!isPdfFile(link)) return;

    const href = link.getAttribute('href');
    if (!href) return;

    const previewBtn = createPreviewButton();

    previewBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await openFilePreview(href);
      } catch (err) {
        kusLog(false, "Error previewing file: " + err.message);
      }
    });

    link.appendChild(previewBtn);
    previewButtonsAdded++;
  });

  const downloadDivs = document.querySelectorAll('div.aalink[onclick*="downloadFile"]');
  downloadDivs.forEach(div => {
    if (div.querySelector('.preview-btn')) return;
    if (!isPdfFile(div)) return;

    const onclickAttr = div.getAttribute('onclick');
    if (!onclickAttr) return;

    const fileUrl = extractUrlFromOnclick(onclickAttr);
    if (!fileUrl) return;

    const previewBtn = createPreviewButton();

    previewBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await openFilePreview(fileUrl);
      } catch (err) {
        kusLog(false, "Error previewing file: " + err.message);
      }
    });

    div.appendChild(previewBtn);
    previewButtonsAdded++;
  });

  const directPdfLinks = document.querySelectorAll('a[href*="/pluginfile.php/"]');
  directPdfLinks.forEach(link => {
    if (link.querySelector('.preview-btn')) return;
    if (!isPdfFile(link)) return;

    const href = link.getAttribute('href');
    if (!href) return;

    const previewBtn = createPreviewButton();

    previewBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await openFilePreview(href);
      } catch (err) {
        kusLog(false, "Error previewing file: " + err.message);
      }
    });

    link.parentNode.insertBefore(previewBtn, link.nextSibling);
    previewButtonsAdded++;
  });

  if (previewButtonsAdded > 0) {
    kusLog(true, `Added ${previewButtonsAdded} preview buttons`);
  }
}

function initializeFeatures() {
  ENABLE_SESSION_AUTO_EXTEND && sessionAutoExtend();
  ENABLE_CUSTOM_COLOR_THEME && customColorTheme();
  ENABLE_HIDE_NAME_AND_ID && hideNameAndId();
  ENABLE_FILE_PREVIEW_BUTTONS && filePreviewButtons();

  kusLog(true, "Initialization complete");
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFeatures);
} else {
  initializeFeatures();
}
