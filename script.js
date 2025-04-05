// ==UserScript==
// @name         KLMS-util-suite
// @namespace    https://klms.kaist.ac.kr/
// @version      1.0.0
// @description  A userscript suite of useful features for KAIST KLMS
// @match        https://klms.kaist.ac.kr/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const MAIN_COLOR = 'rgb(186, 0, 0)';

  // === Helper Functions ===
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

  // === Feature 1: Auto-Extend Session ===
  function autoExtendSession() {
    setInterval(() => {
      const btn = [...document.querySelectorAll('.login-time a')].find(a => /연장|extend/i.test(a.textContent));
      if (btn) {
        btn.click();
        kusLog(true, "Successfully extended login session");
      } else {
        kusLog(false, "Extend session button not found, cannot extend session");
      }
    }, 30 * 60 * 1000); // every 30 minutes
  }

  // === Feature 2: Color Scheme Customizer ===
  function replaceClosestColors() {
    const mappings = [
      { from: 'rgb(0, 65, 145)', to: MAIN_COLOR },
      { from: 'rgb(0, 42, 92)', to: darkenRGB(MAIN_COLOR, 0.2) },
      { from: 'rgb(6, 42, 78)', to: darkenRGB(MAIN_COLOR, 0.3) },
      { from: 'rgb(31, 143, 206)', to: softenRGB(MAIN_COLOR, 30) },
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
  function hideNameAndID() {
    const userSelect = document.querySelector('.multi-users');
    if (userSelect) {
      userSelect.style.display = 'none';
      const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';

    const placeholder = document.createElement('button');
    placeholder.textContent = "Click to show ID/name";
    placeholder.style.background = darkenRGB(MAIN_COLOR, 0.25);
    placeholder.style.color = 'white';
    placeholder.style.border = 'none';
    placeholder.style.padding = '6px 10px';
    placeholder.style.cursor = 'pointer';
    placeholder.style.borderRadius = '10px';

    userSelect.style.display = 'none';

    placeholder.addEventListener('click', () => {
      placeholder.style.display = 'none';
      userSelect.style.display = '';
    });

    const parent = userSelect.parentNode;
    parent.insertBefore(wrapper, userSelect);
    wrapper.appendChild(placeholder);
    wrapper.appendChild(userSelect);

      kusLog(true, "Successfully hid name and ID");
    } else {
      kusLog(false, "Name and ID not found, cannot hide")
    }
  }

  autoExtendSession();
  replaceClosestColors();
  hideNameAndID();
})();
