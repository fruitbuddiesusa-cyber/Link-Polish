/* === Link Polish — LinkedIn Text Formatter === */
/* Pure vanilla. Zero deps. Lightning fast. */

(function () {
  "use strict";

  // --- DOM refs (cached once) ---
  const editor = document.getElementById("editor");
  const preview = document.getElementById("preview");
  const copyBtn = document.getElementById("copyBtn");
  const toolbar = document.getElementById("toolbar");
  const toolbar2 = document.getElementById("toolbar2");
  const emojiOverlay = document.getElementById("emojiOverlay");
  const emojiGrid = document.getElementById("emojiGrid");
  const emojiSearch = document.getElementById("emojiSearch");
  const mobileTabs = document.getElementById("mobileTabs");
  const editorPanel = document.getElementById("editorPanel");
  const previewPanel = document.getElementById("previewPanel");
  const statChars = document.getElementById("statChars");
  const statWords = document.getElementById("statWords");
  const statLines = document.getElementById("statLines");
  const statRead = document.getElementById("statRead");
  const templatesOverlay = document.getElementById("templatesOverlay");
  const templatesList = document.getElementById("templatesList");
  const findReplaceOverlay = document.getElementById("findReplaceOverlay");
  const findInput = document.getElementById("findInput");
  const replaceInput = document.getElementById("replaceInput");
  const findNext = document.getElementById("findNext");
  const replaceOne = document.getElementById("replaceOne");
  const replaceAll = document.getElementById("replaceAll");
  const findStatus = document.getElementById("findStatus");
  const charmapOverlay = document.getElementById("charmapOverlay");
  const charmapCategories = document.getElementById("charmapCategories");
  const charmapGrid = document.getElementById("charmapGrid");

  const STORAGE_KEY = "textcraft_content";
  const CONSENT_KEY = "textcraft_consent";
  const PRO_KEY = "linkpolish_ispro";
  const MASTER_CODE = "PROFORMAT2026";

  // --- Sample post for preview ---
  const SAMPLE = `🚀 𝐓𝐢𝐫𝐞𝐝 𝐨𝐟 𝐩𝐥𝐚𝐢𝐧 𝐋𝐢𝐧𝐤𝐞𝐝𝐈𝐧 𝐩𝐨𝐬𝐭𝐬? 𝐒𝐭𝐚𝐧𝐝 𝐨𝐮𝐭 𝐰𝐢𝐭𝐡 𝐛𝐨𝐥𝐝, 𝐢𝐭𝐚𝐥𝐢𝐜, 𝐚𝐧𝐝 𝐦𝐨𝐫𝐞!

If you've ever wished for 𝐛𝐨𝐥𝐝, 𝑖𝑡𝑎𝑙𝑖𝑐, or u̲n̲d̲e̲r̲l̲i̲n̲e̲ in your LinkedIn posts, I've got great news!

𝐋𝐢𝐧𝐤𝐞𝐝𝐈𝐧 𝐓𝐞𝐱𝐭 𝐅𝐨𝐫𝐦𝐚𝐭𝐭𝐞𝐫, a Chrome extension that helps you:
✅ Format your LinkedIn posts in seconds
✅ Add emphasis with styled text & emojis 😃
✅ Improve engagement effortlessly

Would love your feedback! How do you currently format your LinkedIn posts? Let me know in the comments. 💬`;

  // ============================================================
  //  UNICODE FORMATTING (pre-computed maps for speed)
  // ============================================================
  const BOLD_MAP = {};
  const ITALIC_MAP = {};
  const BOLDITALIC_MAP = {};

  for (let i = 0; i < 26; i++) {
    const ch = String.fromCharCode(65 + i);
    const chl = String.fromCharCode(97 + i);
    BOLD_MAP[ch] = String.fromCodePoint(0x1d400 + i);
    BOLD_MAP[chl] = String.fromCodePoint(0x1d41a + i);
    ITALIC_MAP[ch] = String.fromCodePoint(0x1d434 + i);
    ITALIC_MAP[chl] = i === 7 ? "\u210E" : String.fromCodePoint(0x1d44e + i);
    BOLDITALIC_MAP[ch] = String.fromCodePoint(0x1d468 + i);
    BOLDITALIC_MAP[chl] = String.fromCodePoint(0x1d482 + i);
  }
  for (let i = 0; i < 10; i++) {
    BOLD_MAP[String(i)] = String.fromCodePoint(0x1d7ce + i);
  }

  const REVERSE_MAP = new Map();
  for (const [k, v] of Object.entries(BOLD_MAP)) REVERSE_MAP.set(v, k);
  for (const [k, v] of Object.entries(ITALIC_MAP)) REVERSE_MAP.set(v, k);
  for (const [k, v] of Object.entries(BOLDITALIC_MAP)) REVERSE_MAP.set(v, k);

  function stripFormatting(text) {
    let result = "";
    for (const ch of text) {
      const mapped = REVERSE_MAP.get(ch);
      result += mapped !== undefined ? mapped : ch;
    }
    return result.replace(/[\u0332\u0336]/g, "");
  }

  function toBold(t) { let r = ""; for (const c of t) r += BOLD_MAP[c] || c; return r; }
  function toItalic(t) { let r = ""; for (const c of t) r += ITALIC_MAP[c] || c; return r; }
  function toBoldItalic(t) { let r = ""; for (const c of t) r += BOLDITALIC_MAP[c] || c; return r; }
  function toUnderline(t) { let r = ""; for (const c of t) r += c + "\u0332"; return r; }
  function toStrikethrough(t) { let r = ""; for (const c of t) r += c + "\u0336"; return r; }

  function insertBullets(text) {
    return text.split("\n").map((l) => (l.trim() ? "• " + l : l)).join("\n");
  }

  function insertOrdered(text) {
    let n = 1;
    return text.split("\n").map((l) => (l.trim() ? String.fromCodePoint(0x2460 + n++ - 1) + " " + l : l)).join("\n");
  }

  function detectStyle(text) {
    if (!text) return null;
    const cp = text.codePointAt(0);
    if (cp >= 0x1d400 && cp <= 0x1d433) return "bold";
    if (cp >= 0x1d434 && cp <= 0x1d467) return "italic";
    if (cp >= 0x1d468 && cp <= 0x1d49b) return "boldItalic";
    if (text.includes("\u0332")) return "underline";
    if (text.includes("\u0336")) return "strikethrough";
    return null;
  }

  const FORMATTERS = {
    bold: toBold, italic: toItalic, boldItalic: toBoldItalic,
    underline: toUnderline, strikethrough: toStrikethrough,
    bullet: insertBullets, orderedList: insertOrdered,
  };

  function applyFormat(type) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = editor.value.substring(start, end);
    if (!selected && type !== "bullet" && type !== "orderedList") return;

    const plain = stripFormatting(selected);
    const current = detectStyle(selected);
    const result = current === type ? plain : FORMATTERS[type](plain);

    const scroll = editor.scrollTop;
    editor.value = editor.value.substring(0, start) + result + editor.value.substring(end);
    editor.selectionStart = start;
    editor.selectionEnd = start + result.length;
    editor.scrollTop = scroll;
    editor.focus();
    updatePreview();
  }

  // ============================================================
  //  LIVE STATS
  // ============================================================
  function updateStats() {
    const text = editor.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split("\n").length : 0;
    const readSec = Math.ceil(words / 3.5); // ~3.5 words/sec reading speed
    const readTime = readSec < 60 ? readSec + "s read" : Math.ceil(readSec / 60) + "m read";

    statChars.textContent = chars + " chars";
    statWords.textContent = words + " words";
    statLines.textContent = lines + " lines";
    statRead.textContent = readTime;
  }

  // ============================================================
  //  PREVIEW & STORAGE
  // ============================================================
  function updatePreview() {
    preview.textContent = editor.value || SAMPLE;
    updateStats();
    save();
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, editor.value); } catch (_) {}
  }

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) editor.value = saved;
    } catch (_) {}
  }

  // ============================================================
  //  COPY
  // ============================================================
  async function copyFormatted() {
    // Pro check
    if (!isPro) {
      requirePro("Copy Formatted Text");
      return;
    }
    let textToCopy = editor.value;
    // Auto-insert signature if enabled and not already present
    const autoSig = getAutoSignature();
    if (autoSig && !textToCopy.endsWith(autoSig)) {
      textToCopy += autoSig;
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch (_) {
      try {
        const ta = document.createElement("textarea");
        ta.value = textToCopy;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch (err) {
        showToast("Copy failed. Please select and copy manually.", "error");
        return;
      }
    }
    copyBtn.classList.add("copied");
    copyBtn.querySelector("span").textContent = "Copied!";
    showToast("Copied to clipboard!", "success");
    setTimeout(() => {
      copyBtn.classList.remove("copied");
      copyBtn.querySelector("span").textContent = "Copy Formatted Text";
    }, 1200);
  }

  // ============================================================
  //  CASE CONVERTER
  // ============================================================
  function toTitleCase(str) {
    return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }

  function toSentenceCase(str) {
    return str.replace(/(^\s*\w|[.!?]\s+\w)/g, (m) => m.toUpperCase());
  }

  function convertCase(type) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const hasSelection = start !== end;
    const text = hasSelection ? editor.value.substring(start, end) : editor.value;

    let result;
    switch (type) {
      case "upper": result = text.toUpperCase(); break;
      case "lower": result = text.toLowerCase(); break;
      case "title": result = toTitleCase(text); break;
      case "sentence": result = toSentenceCase(text); break;
      default: return;
    }

    if (hasSelection) {
      editor.value = editor.value.substring(0, start) + result + editor.value.substring(end);
      editor.selectionStart = start;
      editor.selectionEnd = start + result.length;
    } else {
      editor.value = result;
    }
    editor.focus();
    updatePreview();
  }

  // ============================================================
  //  UNDO / REDO
  // ============================================================
  function doUndo() { editor.focus(); document.execCommand("undo"); updatePreview(); }
  function doRedo() { editor.focus(); document.execCommand("redo"); updatePreview(); }

  // ============================================================
  //  TEXT CLEANER
  // ============================================================
  function cleanText() {
    let text = editor.value;
    // Remove trailing spaces per line
    text = text.replace(/[ \t]+$/gm, "");
    // Collapse 3+ blank lines to 2
    text = text.replace(/\n{3,}/g, "\n\n");
    // Remove zero-width chars
    text = text.replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
    editor.value = text;
    updatePreview();
  }

  // ============================================================
  //  AUTO LINE-BREAK FIX
  // ============================================================
  function fixLineBreaks() {
    let text = editor.value;
    // Normalize all line endings to \n
    text = text.replace(/\r\n/g, "\n");
    text = text.replace(/\r/g, "\n");
    // Remove zero-width chars that break line breaks
    text = text.replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u2060]/g, "");
    // Remove trailing whitespace per line
    text = text.replace(/[ \t]+$/gm, "");
    // Collapse multiple blank lines → single blank line
    text = text.replace(/\n{2,}/g, "\n\n");
    // Remove leading blank lines
    text = text.replace(/^\n+/, "");
    // Remove trailing blank lines
    text = text.replace(/\n+$/, "\n");
    editor.value = text;
    updatePreview();
  }

  // ============================================================
  //  EMOJI SPACING FIX
  // ============================================================
  function fixEmojiSpacing() {
    let text = editor.value;
    // Emoji regex (covers most common emojis)
    const emojiRx = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Component}(\uFE0F)?)/gu;
    // Add space before emoji if missing (but not at line start)
    text = text.replace(/([^\s\n])(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/gu, "$1 $2");
    // Add space after emoji if followed by a letter (not newline or space)
    text = text.replace(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)([^\s\n\p{Emoji}])/gu, "$1 $2");
    // Remove double spaces around emojis
    text = text.replace(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)  +/gu, "$1 ");
    text = text.replace(/  +(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/gu, " $1");
    // Clean up: no space before emoji at line start
    text = text.replace(/^\s+(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/gmu, "$1");
    editor.value = text;
    updatePreview();
  }

  // ============================================================
  //  CUSTOM SIGNATURE
  // ============================================================
  const SIG_STORAGE_KEY = "textcraft_signature";
  const SIG_AUTO_KEY = "textcraft_sig_auto";

  const sigName = document.getElementById("sigName");
  const sigTagline = document.getElementById("sigTagline");
  const sigCTA = document.getElementById("sigCTA");
  const sigPreview = document.getElementById("sigPreview");
  const sigSave = document.getElementById("sigSave");
  const sigInsert = document.getElementById("sigInsert");
  const sigAutoInsert = document.getElementById("sigAutoInsert");
  const signatureOverlay = document.getElementById("signatureOverlay");

  function loadSignature() {
    try {
      const saved = JSON.parse(localStorage.getItem(SIG_STORAGE_KEY) || "{}");
      sigName.value = saved.name || "";
      sigTagline.value = saved.tagline || "";
      sigCTA.value = saved.cta || "";
      sigAutoInsert.checked = localStorage.getItem(SIG_AUTO_KEY) === "true";
    } catch (_) {}
    updateSigPreview();
  }

  function saveSignature() {
    const sig = {
      name: sigName.value.trim(),
      tagline: sigTagline.value.trim(),
      cta: sigCTA.value.trim()
    };
    try {
      localStorage.setItem(SIG_STORAGE_KEY, JSON.stringify(sig));
      localStorage.setItem(SIG_AUTO_KEY, sigAutoInsert.checked);
    } catch (_) {}
  }

  function buildSignature() {
    const sig = {
      name: sigName.value.trim(),
      tagline: sigTagline.value.trim(),
      cta: sigCTA.value.trim()
    };
    let result = "";
    if (sig.name || sig.tagline) {
      result += "\n\n";
      if (sig.name) result += "— " + sig.name;
      if (sig.tagline) result += "\n" + sig.tagline;
    }
    if (sig.cta) {
      result += "\n\n" + sig.cta;
    }
    return result;
  }

  function updateSigPreview() {
    const sig = buildSignature();
    sigPreview.textContent = sig || "(empty — fill in above to see preview)";
  }

  function openSignature() {
    if (!requirePro("Custom Signature")) return;
    loadSignature();
    signatureOverlay.classList.add("open");
  }

  function insertSignature() {
    const sig = buildSignature();
    if (!sig) return;
    // Check if signature already exists at end
    const text = editor.value;
    if (text.endsWith(sig)) return;
    editor.value = text + sig;
    editor.selectionStart = editor.selectionEnd = editor.value.length;
    editor.focus();
    updatePreview();
    closeModal(signatureOverlay);
  }

  function getAutoSignature() {
    try {
      const auto = localStorage.getItem(SIG_AUTO_KEY) === "true";
      if (!auto) return "";
      const saved = JSON.parse(localStorage.getItem(SIG_STORAGE_KEY) || "{}");
      let result = "";
      if (saved.name || saved.tagline) {
        result += "\n\n";
        if (saved.name) result += "— " + saved.name;
        if (saved.tagline) result += "\n" + saved.tagline;
      }
      if (saved.cta) result += "\n\n" + saved.cta;
      return result;
    } catch (_) { return ""; }
  }

  // Signature input listeners
  [sigName, sigTagline, sigCTA].forEach((el) => {
    el.addEventListener("input", updateSigPreview);
  });

  sigSave.addEventListener("click", () => {
    saveSignature();
    sigSave.textContent = "✅ Saved!";
    setTimeout(() => sigSave.textContent = "💾 Save Signature", 1000);
  });

  sigInsert.addEventListener("click", () => {
    saveSignature();
    insertSignature();
  });

  sigAutoInsert.addEventListener("change", saveSignature);

  // ============================================================
  //  5 VIRAL HOOK TEMPLATES
  // ============================================================
  const HOOKS = [
    {
      emoji: "🔥",
      title: "The Controversy Hook",
      text: `I'm going to say something that might upset some people:

[Your controversial but valid take]

Here's why I believe this 👇`
    },
    {
      emoji: "💰",
      title: "The Money/Result Hook",
      text: `[RESULT] in [TIMEFRAME]. Here's exactly how I did it:

Step 1: [Action]
Step 2: [Action]
Step 3: [Action]

No fluff. No theory. Just what worked. 🔥`
    },
    {
      emoji: "😱",
      title: "The Shocking Fact Hook",
      text: `I just learned something that completely changed how I think about [TOPIC]:

[Shocking fact or insight]

And most people have no idea about this. Here's what it means for you 👇`
    },
    {
      emoji: "🎯",
      title: "The Listicle Hook",
      text: `[X] things I wish someone told me when I started [ROLE/JOURNEY]:

1️⃣ [Lesson]
2️⃣ [Lesson]
3️⃣ [Lesson]
4️⃣ [Lesson]
5️⃣ [Lesson]

Save this. You'll need it later. 🔖`
    },
    {
      emoji: "🧠",
      title: "The Story Hook",
      text: `A [PERSON] told me something that stuck with me:

"[Quote or lesson]"

At first I didn't understand. But years later, it all made sense.

Here's what they meant 👇`
    }
  ];

  const hooksOverlay = document.getElementById("hooksOverlay");
  const hooksList = document.getElementById("hooksList");

  function openHooks() {
    hooksList.innerHTML = HOOKS.map((h, i) =>
      `<div class="hook-item" data-index="${i}">
        <div class="hook-title"><span class="hook-emoji">${h.emoji}</span>${h.title}</div>
        <div class="hook-preview">${h.text.substring(0, 100)}...</div>
      </div>`
    ).join("");
    hooksOverlay.classList.add("open");
  }

  function insertHook(index) {
    const hook = HOOKS[index];
    if (!hook) return;
    const start = editor.selectionStart;
    // If editor has content, add newline before hook
    const prefix = editor.value.length > 0 && start > 0 ? "\n\n" : "";
    const text = prefix + hook.text;
    editor.value = editor.value.slice(0, start) + text + editor.value.slice(start);
    editor.selectionStart = editor.selectionEnd = start + text.length;
    editor.focus();
    updatePreview();
    closeModal(hooksOverlay);
  }

  hooksList.addEventListener("click", (e) => {
    const item = e.target.closest(".hook-item");
    if (item) insertHook(parseInt(item.dataset.index, 10));
  });

  // ============================================================
  //  EXPORT AS .TXT
  // ============================================================
  function exportTxt() {
    try {
      if (!editor.value.trim()) {
        showToast("Nothing to export. Write something first!", "warning");
        return;
      }
      const blob = new Blob([editor.value], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "linkpolish-post-" + new Date().toISOString().slice(0, 10) + ".txt";
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("File downloaded!", "success");
    } catch (_) {
      showToast("Export failed. Try again.", "error");
    }
  }

  // ============================================================
  //  TEMPLATES
  // ============================================================
  const TEMPLATES = [
    {
      title: "🚀 Launch Announcement",
      text: `🚀 Excited to announce [PRODUCT/FEATURE]!

After months of hard work, we're thrilled to finally share this with you.

Here's what makes it special:
✅ [Feature 1]
✅ [Feature 2]
✅ [Feature 3]

Try it out and let us know what you think! 💬

#Launch #Innovation #Product`
    },
    {
      title: "💡 Lessons Learned",
      text: `💡 [X] lessons I learned as a [ROLE]:

1️⃣ [Lesson 1]
2️⃣ [Lesson 2]
3️⃣ [Lesson 3]
4️⃣ [Lesson 4]
5️⃣ [Lesson 5]

Which one resonates with you? Drop a comment below 👇

#Career #Growth #LessonsLearned`
    },
    {
      title: "📊 Tips & How-To",
      text: `📊 Want to [ACHIEVE GOAL]? Here's how:

Here are [X] actionable tips:

✅ Tip 1: [Description]
✅ Tip 2: [Description]
✅ Tip 3: [Description]
✅ Tip 4: [Description]
✅ Tip 5: [Description]

Save this post for later 🔖 and share with someone who needs it!

#Tips #HowTo #Productivity`
    },
    {
      title: "🎉 Milestone / Achievement",
      text: `🎉 Milestone unlocked!

I'm thrilled to share that [ACHIEVEMENT].

This journey has been incredible, and I couldn't have done it without:
🙏 [Person/Team]
🙏 [Person/Team]
🙏 [Person/Team]

Here's to the next chapter! 🚀

#Milestone #Achievement #Grateful`
    },
    {
      title: "📝 Job Update",
      text: `I'm happy to share that I've started a new position as [JOB TITLE] at [COMPANY]!

Excited to:
🎯 [Goal 1]
🎯 [Goal 2]
🎯 [Goal 3]

Looking forward to this new journey! 🚀

#NewJob #Career #Hiring`
    },
    {
      title: "🔥 Hot Take / Opinion",
      text: `🔥 Unpopular opinion:

[Your bold statement here]

Here's why I think this:
1️⃣ [Reason 1]
2️⃣ [Reason 2]
3️⃣ [Reason 3]

Agree or disagree? Let me know in the comments 👇

#HotTake #Opinion #Debate`
    },
    {
      title: "📚 Book / Resource Review",
      text: `📚 Just finished reading "[BOOK/RESOURCE]" — here's my take:

⭐ Rating: [X]/5

What I loved:
✅ [Point 1]
✅ [Point 2]
✅ [Point 3]

Who should read this: [Target audience]

Would love to hear your thoughts if you've read it! 💬

#BookReview #Learning #Growth`
    },
    {
      title: "🙏 Gratitude / Thank You",
      text: `🙏 A heartfelt thank you to [PERSON/TEAM/COMMUNITY].

[Describe what they did and why it mattered]

Moments like these remind me why I love what I do.

Thank you for being part of this journey! ❤️

#Gratitude #ThankYou #Community`
    }
  ];

  function openTemplates() {
    templatesList.innerHTML = TEMPLATES.map((t, i) =>
      `<div class="template-item" data-index="${i}">
        <div class="template-title">${t.title}</div>
        <div class="template-preview">${t.text.substring(0, 80)}...</div>
      </div>`
    ).join("");
    templatesOverlay.classList.add("open");
  }

  function insertTemplate(index) {
    const tmpl = TEMPLATES[index];
    if (!tmpl) return;
    const start = editor.selectionStart;
    editor.value = editor.value.slice(0, start) + tmpl.text + editor.value.slice(start);
    editor.selectionStart = editor.selectionEnd = start + tmpl.text.length;
    editor.focus();
    updatePreview();
    closeModal(templatesOverlay);
  }

  // ============================================================
  //  FIND & REPLACE
  // ============================================================
  function openFindReplace() {
    findInput.value = "";
    replaceInput.value = "";
    findStatus.textContent = "";
    findReplaceOverlay.classList.add("open");
    setTimeout(() => findInput.focus(), 50);
  }

  function doFindNext() {
    const query = findInput.value;
    if (!query) return;
    const text = editor.value;
    const start = editor.selectionEnd;
    const idx = text.indexOf(query, start);
    if (idx === -1) {
      // Wrap around
      const wrapIdx = text.indexOf(query, 0);
      if (wrapIdx === -1) {
        findStatus.textContent = "Not found";
        return;
      }
      editor.selectionStart = wrapIdx;
      editor.selectionEnd = wrapIdx + query.length;
    } else {
      editor.selectionStart = idx;
      editor.selectionEnd = idx + query.length;
    }
    editor.focus();
    editor.scrollIntoView({ behavior: "smooth", block: "center" });
    findStatus.textContent = "";
  }

  function doReplaceOne() {
    const query = findInput.value;
    const replacement = replaceInput.value;
    if (!query) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = editor.value.substring(start, end);
    if (selected === query) {
      editor.value = editor.value.substring(0, start) + replacement + editor.value.substring(end);
      editor.selectionStart = start;
      editor.selectionEnd = start + replacement.length;
      updatePreview();
    }
    doFindNext();
  }

  function doReplaceAll() {
    const query = findInput.value;
    const replacement = replaceInput.value;
    if (!query) return;
    const count = editor.value.split(query).length - 1;
    editor.value = editor.value.replaceAll(query, replacement);
    findStatus.textContent = `Replaced ${count} occurrence${count !== 1 ? "s" : ""}`;
    editor.focus();
    updatePreview();
  }

  // ============================================================
  //  CHARACTER MAP
  // ============================================================
  const CHARMAP_DATA = {
    "Arrows": ["←","→","↑","↓","↔","↕","⇐","⇒","⇑","⇓","⇄","⇅","↺","↻","↩","↪","⤴","⤵","⤶","⤷"],
    "Math": ["±","×","÷","≠","≈","≤","≥","∞","∑","∏","√","∫","∂","∇","∈","∉","⊂","⊃","∪","∩"],
    "Currency": ["$","€","£","¥","₹","₽","₩","₪","₫","₱","₲","₵","₢","₣","₤","₧","₨","₩","₺","₼"],
    "Symbols": ["©","®","™","§","¶","†","‡","•","…","‰","′","″","‹","›","«","»","°","℃","℉","№"],
    "Punctuation": ["\u2014","\u2013","\u2010","\u00B7","\u201A","\u201E","\u2018\u2019","\u201C\u201D","\u2026","\u00A1","\u00BF","\u2039","\u203A","\u00AB","\u00B7","\u2022","\u2023","\u2053","\u2042"],
    "Fractions": ["½","⅓","⅔","¼","¾","⅕","⅖","⅗","⅘","⅙","⅚","⅛","⅜","⅝","⅞"],
    "Latin Accents": ["À","Á","Â","Ã","Ä","Å","Æ","Ç","È","É","Ê","Ë","Ì","Í","Î","Ï","Ð","Ñ","Ò","Ó"],
    "Shapes": ["●","○","◆","◇","■","□","▲","△","▼","▽","★","☆","♦","♣","♠","♥","◉","◎","◍","◌"],
    "Checks": ["✓","✔","✗","✘","☐","☑","☒","✅","❌","❎"],
    "Stars": ["★","☆","✦","✧","✪","✫","✬","✭","✮","✯","✰","⋆","⍟","⍣","⭐","🌟","💫","✨","🌠"]
  };

  let activeCharmapCat = Object.keys(CHARMAP_DATA)[0];

  function openCharmap() {
    // Render categories
    charmapCategories.innerHTML = Object.keys(CHARMAP_DATA).map((cat) =>
      `<button class="charmap-cat-btn${cat === activeCharmapCat ? " active" : ""}" data-cat="${cat}">${cat}</button>`
    ).join("");
    renderCharmapChars(activeCharmapCat);
    charmapOverlay.classList.add("open");
  }

  function renderCharmapChars(category) {
    const chars = CHARMAP_DATA[category] || [];
    charmapGrid.innerHTML = chars.map((ch) =>
      `<button class="charmap-cell" data-char="${ch}">${ch}</button>`
    ).join("");
  }

  function insertChar(ch) {
    const start = editor.selectionStart;
    editor.value = editor.value.slice(0, start) + ch + editor.value.slice(start);
    editor.selectionStart = editor.selectionEnd = start + ch.length;
    editor.focus();
    updatePreview();
  }

  // ============================================================
  //  MODAL HELPERS
  // ============================================================
  function closeModal(el) {
    el.classList.remove("open");
  }

  // Close modals on overlay click or close button
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.close;
      const el = document.getElementById(id);
      if (el) closeModal(el);
    });
  });

  // ============================================================
  //  EMOJI PICKER
  // ============================================================
  const EMOJI_LIST = [
    "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘",
    "😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞",
    "😔","😟","😕","🙁","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳",
    "🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄",
    "😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒",
    "🤕","🤑","🤠","😈","👿","👹","👺","🤡","💩","👻","💀","☠️","👽","👾","🤖","🎃","😺",
    "😸","😹","😻","😼","😽","🙀","😿","😾",
    "👍","👎","👊","✊","🤛","🤜","🤞","✌️","🤟","🤘","👌","🤌","🤏","👈","👉","👆","👇",
    "☝️","✋","🤚","🖐","🖖","👋","🤙","💪","🦾","🙏","🤝","👏","🙌","👐","🤲","🫶",
    "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘",
    "💝","💟","☮️","✝️","☪️","🕉","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊",
    "♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚",
    "🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹","🈲","🅰️","🅱️","🆎","🆑",
    "🅾️","🆘","❌","⭕","🛑","⛔","📛","🚫","💯","💢","♨️","🚷","🚯","🚳","🚱","🔞","📵",
    "🚭","❗","❕","❓","❔","‼️","⁉️","🔅","🔆","〽️","⚠️","🚸","🔱","⚜️","🔰","♻️","✅",
    "🈯","💹","❇️","✳️","❎","🌐","💠","Ⓜ️","🌀","💤","🏧","🚾","♿","🅿️","🛗","🈳","🈂️",
    "🛂","🛃","🛄","🛅","🚹","🚺","🚼","⚧","🚻","🚮","🎦","📶","🈁","🔣","ℹ️","🔤","🔡",
    "🔠","🆖","🆗","🆙","🆒","🆕","🆓","0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣",
    "🔟","🔢","#️⃣","*️⃣","⏏️","▶️","⏸","⏯","⏹","⏺","⏭","⏮","⏩","⏪","⏫","⏬","◀️","🔼",
    "🔽","➡️","⬅️","⬆️","⬇️","↗️","↘️","↙️","↖️","↕️","↔️","↪️","↩️","⤴️","⤵️","🔀","🔁",
    "🔂","🔄","🔃","🎵","🎶","➕","➖","➗","✖️","🟰","♾️","💲","💱","™️","©️","®️","〰️","➰",
    "➿","🔚","🔙","🔛","🔝","🔜","✔️","☑️","🔘","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪",
    "🟤","🔺","🔻","🔸","🔹","🔶","🔷","🔳","🔲","▪️","▫️","◾","◽","◼️","◻️","🟥","🟧",
    "🟨","🟩","🟦","🟪","⬛","⬜","🟫","🔈","🔇","🔉","🔊","🔔","🔕","📣","📢","💬","💭",
    "🗯","♠️","♣️","♥️","♦️","🃏","🎴","🀄","🕐","🕑","🕒","🕓","🕔","🕕","🕖","🕗","🕘",
    "🕙","🕚","🕛","🕜","🕝","🕞","🕟","🕠","🕡","🕢","🕣","🕤","🕥","🕦","🕧",
    "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧",
    "🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🪲",
    "🐢","🐍","🦎","🦂","🦀","🦑","🐙","🦐","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆",
    "🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑",
    "🦙","🐐","🦌","🐕","🐩","🦮","🐈","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🐇","🦝","🦨",
    "🦫","🦦","🦥","🐁","🐀","🐿","🦔","🐾","🐉","🐲",
    "🌸","💐","🌷","🌹","🥀","🌺","🌻","🌼","🌱","🌲","🌳","🌴","🌵","🎋","🎍","🍀","☘️",
    "🍁","🍂","🍃","🪹","🪺","🍄","🌰","🫒","🫐","🍇","🍈","🍉","🍊","🍋","🍌","🍍","🥭",
    "🍎","🍏","🍐","🍑","🍒","🍓","🫐","🥝","🍅","🥥","🥑","🍆","🥔","🥕","🌽","🌶","🫑",
    "🥒","🥬","🥦","🧄","🧅","🍄","🥜","🫘","🌰","🍞","🥐","🥖","🫓","🥨","🥯","🥞","🧇",
    "🧀","🍖","🍗","🥩","🥓","🍔","🍟","🍕","🌭","🥪","🌮","🌯","🫔","🥙","🧆","🥚","🍳",
    "🥘","🍲","🫕","🥣","🥗","🍿","🧈","🧂","🥫","🍱","🍘","🍙","🍚","🍛","🍜","🍝","🍠",
    "🍢","🍣","🍤","🍥","🥮","🍡","🥟","🥠","🥡","🦀","🦞","🦐","🦑","🦪","🍦","🍧","🍨",
    "🍩","🍪","🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","🍼","🥛","☕","🫖","🍵","🍶",
    "🍾","🍷","🍸","🍹","🍺","🍻","🥂","🥃","🫗","🥤","🧋","🧃","🧉","🧊","🥢","🍽","🍴",
    "🥄","🔪","🫙","🏺",
    "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏",
    "🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸","🥌","🎿","⛷",
    "🏂","🪂","🏋️","🤼","🤸","🤺","⛹️","🤾","🏌️","🏇","🧘","🏄","🏊","🤽","🚣","🧗","🚵",
    "🚴","🏆","🥇","🥈","🥉","🏅","🎖","🏵","🎗","🎫","🎟","🎪","🤹","🎭","🎨","🎬","🎤",
    "🎧","🎼","🎹","🥁","🪘","🎷","🎺","🪗","🎸","🪕","🎻","🎲","♟","🎯","🎳","🎮","🕹",
    "🧩","👾","🥷","🫂","👫","👬","👭","💏","💑","👪","👨‍👩‍👦","👨‍👩‍👧","👨‍👩‍👧‍👦","👨‍👩‍👦‍👦","👨‍👩‍👧‍👧",
    "💻","🖥","🖨","⌨️","🖱","🖲","💽","💾","💿","📀","🧮","🎬","🎥","📷","📸","📹","📼",
    "📱","📲","☎️","📞","📟","📠","🔋","🔌","💡","🔦","🕯","🪔","🛢","💸","💵","💴","💶",
    "💷","🪙","💰","💳","💎","⚖️","🪜","🧰","🪛","🔧","🔨","⚒","🛠","⛏","🪚","🔩","⚙️",
    "🪤","🧱","⛓","🧲","🔫","💣","🧨","🪓","🔪","🗡","⚔️","🛡","🚬","⚰️","🪦","⚱️","🏺",
    "🔮","📿","🧿","🪬","💈","⚗️","🔭","🔬","🕳","🩹","🩺","🩻","🩼","💊","💉","🩸","🧬",
    "🦠","🧫","🧪","🌡","🧹","🪠","🧺","🧻","🚽","🪣","🧼","🪥","🧽","🧴","🔑","🗝","🚪",
    "🪑","🛋","🛏","🪞","🪟","🧳","🛒","🎁","🎈","🎏","🎀","🪄","🪅","🎊","🎉","🎎","🏮",
    "🎐","🧧","✉️","📩","📨","📧","💌","📥","📤","📦","🏷","🪧","📪","📫","📬","📭","📮",
    "📯","📜","📃","📄","📑","🧾","📊","📈","📉","🗒","🗓","📆","📅","🗑","📇","🗃","🗳",
    "🗄","📋","📁","📂","🗂","🗞","📰","📓","📔","📒","📕","📗","📘","📙","📚","📖","🔖",
    "🧷","🔗","📎","🖇","📐","📏","🧮","📌","📍","✂️","🖊","🖋","✒️","🖌","🖍","📝","✏️",
    "🔍","🔎","🔏","🔐","🔒","🔓",
    "🚗","🚕","🚙","🚌","🚎","🏎","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🦯","🦽","🦼",
    "🛴","🚲","🛵","🏍","🛺","🚨","🚔","🚍","🚘","🚖","🛞","🚡","🚠","🚟","🚃","🚋","🚞",
    "🚝","🚄","🚅","🚈","🚂","🚆","🚇","🚊","🚉","✈️","🛫","🛬","🛩","💺","🛰","🚀","🛸",
    "🚁","🛶","⛵","🚤","🛥","🛳","⛴","🚢","🗼","🏰","🏯","🏟","🎡","🎢","🎠","⛲","⛱",
    "🏖","🏝","🏜","🌋","⛰","🏔","🗻","🏕","⛺","🏠","🏡","🏘","🏚","🏗","🏭","🏢","🏬",
    "🏣","🏤","🏥","🏦","🏨","🏪","🏫","🏩","💒","🏛","⛪","🕌","🕍","🛕","🕋","⛩","🛤",
    "🛣","🗾","🎑","🏞","🌅","🌄","🌠","🎇","🎆","🌇","🌆","🏙","🌃","🌌","🌉","🌁"
  ];

  let filteredEmojis = [...EMOJI_LIST];

  function renderEmojis(list) {
    const frag = document.createDocumentFragment();
    for (const e of list) {
      const btn = document.createElement("button");
      btn.className = "emoji-cell";
      btn.textContent = e;
      btn.dataset.emoji = e;
      frag.appendChild(btn);
    }
    emojiGrid.innerHTML = "";
    emojiGrid.appendChild(frag);
  }

  function openEmojiPicker() {
    filteredEmojis = [...EMOJI_LIST];
    renderEmojis(filteredEmojis);
    emojiSearch.value = "";
    emojiOverlay.classList.add("open");
    setTimeout(() => emojiSearch.focus(), 50);
  }

  function closeEmojiPicker() {
    emojiOverlay.classList.remove("open");
  }

  function insertEmoji(emoji) {
    const start = editor.selectionStart;
    editor.value = editor.value.slice(0, start) + emoji + editor.value.slice(start);
    editor.selectionStart = editor.selectionEnd = start + emoji.length;
    editor.focus();
    updatePreview();
  }

  // ============================================================
  //  CLEAR
  // ============================================================
  function clearEditor() {
    if (!editor.value || confirm("Clear all content?")) {
      editor.value = "";
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      updatePreview();
      showToast("Editor cleared", "info");
    }
  }

  // ============================================================
  //  EVENT HANDLERS
  // ============================================================

  // Toolbar 1 — Formatting
  toolbar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "emoji") return openEmojiPicker();
    if (action === "clear") return clearEditor();
    applyFormat(action);
  });

  // Toolbar 2 — Tools
  toolbar2.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    switch (action) {
      case "undo": doUndo(); break;
      case "redo": doRedo(); break;
      case "caseUpper": convertCase("upper"); break;
      case "caseLower": convertCase("lower"); break;
      case "caseTitle": convertCase("title"); break;
      case "templates": openTemplates(); break;
      case "findReplace": openFindReplace(); break;
      case "charmap": openCharmap(); break;
      case "cleanText": cleanText(); break;
      case "emojiFix": fixEmojiSpacing(); break;
      case "signature": openSignature(); break;
      case "hooks": openHooks(); break;
      case "linebreak": fixLineBreaks(); break;
      case "export": exportTxt(); break;
    }
  });

  // Templates click
  templatesList.addEventListener("click", (e) => {
    const item = e.target.closest(".template-item");
    if (item) insertTemplate(parseInt(item.dataset.index, 10));
  });

  // Find & Replace buttons
  findNext.addEventListener("click", doFindNext);
  replaceOne.addEventListener("click", doReplaceOne);
  replaceAll.addEventListener("click", doReplaceAll);

  // Enter key in find input
  findInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); doFindNext(); }
  });

  // Character map click
  charmapCategories.addEventListener("click", (e) => {
    const btn = e.target.closest(".charmap-cat-btn");
    if (!btn) return;
    activeCharmapCat = btn.dataset.cat;
    charmapCategories.querySelectorAll(".charmap-cat-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.cat === activeCharmapCat)
    );
    renderCharmapChars(activeCharmapCat);
  });

  charmapGrid.addEventListener("click", (e) => {
    const cell = e.target.closest(".charmap-cell");
    if (cell) {
      insertChar(cell.dataset.char);
      closeModal(charmapOverlay);
    }
  });

  // Keyboard shortcuts
  editor.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key === "b") { e.preventDefault(); applyFormat("bold"); }
      if (e.key === "i") { e.preventDefault(); applyFormat("italic"); }
      if (e.key === "u") { e.preventDefault(); applyFormat("underline"); }
      if (e.key === "z") { e.preventDefault(); doUndo(); }
      if (e.key === "y") { e.preventDefault(); doRedo(); }
      if (e.key === "h") { e.preventDefault(); openFindReplace(); }
      if (e.key === "s") { e.preventDefault(); exportTxt(); }
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      if (e.key === "X" || e.key === "x") { e.preventDefault(); applyFormat("strikethrough"); }
      if (e.key === "B" || e.key === "b") { e.preventDefault(); applyFormat("boldItalic"); }
      if (e.key === "U" || e.key === "u") { e.preventDefault(); convertCase("upper"); }
      if (e.key === "L" || e.key === "l") { e.preventDefault(); convertCase("lower"); }
      if (e.key === "T" || e.key === "t") { e.preventDefault(); convertCase("title"); }
    }
  });

  // Copy button
  copyBtn.addEventListener("click", copyFormatted);

  // Editor input → preview + stats
  editor.addEventListener("input", updatePreview);

  // Emoji picker events
  emojiOverlay.addEventListener("click", (e) => {
    if (e.target === emojiOverlay) closeEmojiPicker();
  });

  emojiGrid.addEventListener("click", (e) => {
    const cell = e.target.closest(".emoji-cell");
    if (cell) {
      insertEmoji(cell.dataset.emoji);
      closeEmojiPicker();
    }
  });

  let searchTimer;
  emojiSearch.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = emojiSearch.value.trim().toLowerCase();
      if (!q) {
        filteredEmojis = [...EMOJI_LIST];
      } else {
        filteredEmojis = EMOJI_LIST.filter((e) => e.includes(q));
      }
      renderEmojis(filteredEmojis);
    }, 100);
  });

  // Escape to close any open modal/picker
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeEmojiPicker();
      closeModal(templatesOverlay);
      closeModal(findReplaceOverlay);
      closeModal(charmapOverlay);
      closeModal(signatureOverlay);
      closeModal(hooksOverlay);
    }
  });

  // ============================================================
  //  TOAST NOTIFICATION SYSTEM
  // ============================================================
  function showToast(message, type = "info") {
    const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("toast-out");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ============================================================
  //  PRO SYSTEM
  // ============================================================
  let isPro = false;

  function checkPro() {
    try {
      isPro = localStorage.getItem(PRO_KEY) === "true";
    } catch (_) {
      isPro = false;
    }
    updateProUI();
  }

  function unlockPro(code) {
    if (code === MASTER_CODE) {
      isPro = true;
      try { localStorage.setItem(PRO_KEY, "true"); } catch (_) {}
      updateProUI();
      showToast("Pro unlocked! All features unlocked 🎉", "success");
      closeModal(paywallOverlay);
      return true;
    }
    return false;
  }

  function updateProUI() {
    // Show/hide pro badge next to brand
    const badge = document.querySelector(".badge");
    if (badge) {
      if (isPro) {
        badge.innerHTML = "⚡ Pro";
        badge.style.background = "linear-gradient(135deg, #f59e0b, #ef4444)";
        badge.style.color = "#fff";
      } else {
        badge.textContent = "LinkedIn";
        badge.style.background = "";
        badge.style.color = "";
      }
    }
    // Hide CTA banner for pro users
    const ctaBanner = document.getElementById("proCtaBanner");
    if (ctaBanner) {
      ctaBanner.style.display = isPro ? "none" : "";
    }
    // Update copy button text for free users
    const copyBtnSpan = copyBtn.querySelector("span");
    if (copyBtnSpan) {
      copyBtnSpan.textContent = isPro ? "Copy Formatted Text" : "🔒 Copy (Pro)";
    }
    // Disable/enable signature for free users
    const sigBtn = toolbar2.querySelector('[data-action="signature"]');
    if (sigBtn) {
      sigBtn.style.opacity = isPro ? "" : "0.5";
      sigBtn.title = isPro ? "Custom Signature" : "Custom Signature (Pro only)";
    }
  }

  function requirePro(feature) {
    if (isPro) return true;
    showToast(`${feature} is a Pro feature. Enter your unlock code.`, "warning");
    paywallOverlay.classList.add("open");
    if (unlockCode) unlockCode.value = "";
    if (unlockStatus) unlockStatus.textContent = "";
    return false;
  }

  // Paywall events
  if (unlockBtn) {
    unlockBtn.addEventListener("click", () => {
      const code = (unlockCode.value || "").trim();
      if (!code) {
        unlockStatus.textContent = "Please enter a code";
        unlockStatus.className = "unlock-status error";
        return;
      }
      if (!unlockPro(code)) {
        unlockStatus.textContent = "Invalid code. Try again.";
        unlockStatus.className = "unlock-status error";
        showToast("Invalid unlock code", "error");
      }
    });
  }

  if (unlockCode) {
    unlockCode.addEventListener("keydown", (e) => {
      if (e.key === "Enter") unlockBtn.click();
    });
  }

  // ============================================================
  //  COUNTDOWN TIMER (Fake urgency)
  // ============================================================
  const cdHours = document.getElementById("cdHours");
  const cdMinutes = document.getElementById("cdMinutes");
  const cdSeconds = document.getElementById("cdSeconds");
  const spotsCount = document.getElementById("spotsCount");
  const spotsBarFill = document.getElementById("spotsBarFill");
  const proofText = document.getElementById("proofText");

  // Persistent countdown — resets every ~3 hours, stored in localStorage
  const COUNTDOWN_KEY = "lp_countdown_end";
  const SPOTS_KEY = "lp_spots";

  function getCountdownEnd() {
    try {
      let end = parseInt(localStorage.getItem(COUNTDOWN_KEY), 10);
      const now = Date.now();
      if (!end || end < now) {
        // Set new countdown: random 1h–3h from now
        const hours = 1 + Math.random() * 2;
        end = now + hours * 3600 * 1000;
        localStorage.setItem(COUNTDOWN_KEY, end);
      }
      return end;
    } catch (_) {
      return Date.now() + 2.5 * 3600 * 1000;
    }
  }

  function updateCountdown() {
    const end = getCountdownEnd();
    const now = Date.now();
    let diff = Math.max(0, Math.floor((end - now) / 1000));

    const h = Math.floor(diff / 3600);
    diff %= 3600;
    const m = Math.floor(diff / 60);
    const s = diff % 60;

    if (cdHours) cdHours.textContent = String(h).padStart(2, "0");
    if (cdMinutes) cdMinutes.textContent = String(m).padStart(2, "0");
    if (cdSeconds) cdSeconds.textContent = String(s).padStart(2, "0");
  }

  // Start countdown
  setInterval(updateCountdown, 1000);
  updateCountdown();

  // CTA banner timer (sync with countdown)
  const proCtaTimer = document.getElementById("proCtaTimer");
  function updateCtaTimer() {
    if (!proCtaTimer) return;
    const end = getCountdownEnd();
    const now = Date.now();
    let diff = Math.max(0, Math.floor((end - now) / 1000));
    const h = Math.floor(diff / 3600);
    diff %= 3600;
    const m = Math.floor(diff / 60);
    proCtaTimer.textContent = "🔥 " + h + "h " + String(m).padStart(2, "0") + "m left";
  }
  setInterval(updateCtaTimer, 1000);
  updateCtaTimer();

  // ============================================================
  //  SPOTS REMAINING (Fake scarcity)
  // ============================================================
  function getSpots() {
    try {
      let spots = parseInt(localStorage.getItem(SPOTS_KEY), 10);
      if (!spots || spots < 5 || spots > 30) {
        spots = 12 + Math.floor(Math.random() * 11); // 12–22
        localStorage.setItem(SPOTS_KEY, spots);
      }
      return spots;
    } catch (_) {
      return 17;
    }
  }

  function updateSpots() {
    const spots = getSpots();
    if (spotsCount) spotsCount.textContent = spots;
    // Bar fill: lower spots = more filled
    const pct = Math.max(15, Math.min(95, 100 - (spots / 30) * 100));
    if (spotsBarFill) spotsBarFill.style.width = pct + "%";
  }

  // Occasionally decrease spots
  function maybeDecreaseSpot() {
    try {
      let spots = parseInt(localStorage.getItem(SPOTS_KEY), 10) || 17;
      if (spots > 3 && Math.random() < 0.3) {
        spots--;
        localStorage.setItem(SPOTS_KEY, spots);
        updateSpots();
      }
    } catch (_) {}
  }

  updateSpots();
  setInterval(maybeDecreaseSpot, 45000); // Check every 45s

  // ============================================================
  //  SOCIAL PROOF TICKER (Fake purchases)
  // ============================================================
  const FIRST_NAMES = [
    "James", "Sarah", "Mike", "Emma", "David", "Lisa", "Alex", "Rachel",
    "Tom", "Jessica", "Ryan", "Ashley", "Chris", "Amanda", "Brian", "Megan",
    "Jason", "Lauren", "Kevin", "Stephanie", "Daniel", "Nicole", "Matt", "Brittany",
    "Andrew", "Jennifer", "Josh", "Kayla", "Brandon", "Samantha", "Tyler", "Olivia",
    "Nathan", "Hannah", "Marcus", "Chloe", "Ethan", "Sophia", "Leo", "Mia",
    "Noah", "Isabella", "Liam", "Ava", "Oliver", "Charlotte", "Elijah", "Amelia"
  ];

  const CITIES = [
    "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "San Diego",
    "Dallas", "Austin", "Seattle", "Denver", "Boston", "Miami", "Atlanta",
    "Portland", "Nashville", "San Francisco", "Las Vegas", "Orlando",
    "London", "Toronto", "Sydney", "Berlin", "Paris", "Amsterdam",
    "Singapore", "Dubai", "Mumbai", "Bangalore", "Tokyo", "Melbourne"
  ];

  const ACTIONS = [
    "just upgraded to Pro",
    "just purchased Link Polish Pro",
    "just unlocked lifetime access",
    "just grabbed the $9 deal",
    "just got Pro — lifetime",
    "just secured their lifetime license"
  ];

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function timeAgo() {
    const mins = Math.floor(Math.random() * 15) + 1;
    return mins === 1 ? "1 min ago" : mins + " mins ago";
  }

  function generateProof() {
    const name = randomFrom(FIRST_NAMES);
    const city = randomFrom(CITIES);
    const action = randomFrom(ACTIONS);
    const time = timeAgo();
    return `<strong>${name}</strong> from ${city} ${action} <span style="opacity:.6">· ${time}</span>`;
  }

  function cycleSocialProof() {
    if (!proofText) return;
    // Fade out
    proofText.parentElement.style.animation = "none";
    proofText.parentElement.offsetHeight; // trigger reflow
    proofText.parentElement.style.animation = "proofFadeIn 0.5s ease";
    proofText.innerHTML = generateProof();
  }

  // Initial proof
  setTimeout(cycleSocialProof, 1000);
  // Cycle every 5–8 seconds
  setInterval(cycleSocialProof, 5000 + Math.random() * 3000);

  // ============================================================
  //  CONSENT BANNER
  // ============================================================
  const consentBanner = document.getElementById("consentBanner");
  const consentAccept = document.getElementById("consentAccept");
  const consentDecline = document.getElementById("consentDecline");
  const paywallOverlay = document.getElementById("paywallOverlay");
  const unlockCode = document.getElementById("unlockCode");
  const unlockBtn = document.getElementById("unlockBtn");
  const unlockStatus = document.getElementById("unlockStatus");
  const toastContainer = document.getElementById("toastContainer");

  let consentGiven = false;

  function checkConsent() {
    try {
      consentGiven = localStorage.getItem(CONSENT_KEY) === "accepted";
    } catch (_) {
      consentGiven = false;
    }
    if (!consentGiven && consentBanner) {
      consentBanner.classList.add("show");
    }
  }

  function giveConsent(accepted) {
    consentGiven = accepted;
    try {
      localStorage.setItem(CONSENT_KEY, accepted ? "accepted" : "declined");
    } catch (_) {}
    if (consentBanner) consentBanner.classList.remove("show");
    if (!accepted) {
      // Clear any saved data if declined
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SIG_STORAGE_KEY);
        localStorage.removeItem(SIG_AUTO_KEY);
      } catch (_) {}
    }
  }

  if (consentAccept) consentAccept.addEventListener("click", () => giveConsent(true));
  if (consentDecline) consentDecline.addEventListener("click", () => giveConsent(false));

  // Wrap save to check consent
  const _origSave = save;
  save = function() {
    if (!consentGiven) return;
    try { localStorage.setItem(STORAGE_KEY, editor.value); } catch (_) {}
  };

  // ============================================================
  //  MOBILE TAB SWITCHING
  // ============================================================
  function isMobile() { return window.innerWidth <= 540; }

  function switchTab(tab) {
    if (!mobileTabs) return;
    mobileTabs.querySelectorAll(".mobile-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === tab);
    });
    if (tab === "editor") {
      editorPanel.style.display = "";
      previewPanel.style.display = "none";
    } else {
      editorPanel.style.display = "none";
      previewPanel.style.display = "";
    }
  }

  if (mobileTabs) {
    mobileTabs.addEventListener("click", (e) => {
      const tab = e.target.closest(".mobile-tab");
      if (tab) switchTab(tab.dataset.tab);
    });

    if (isMobile()) switchTab("editor");

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!isMobile()) {
          editorPanel.style.display = "";
          previewPanel.style.display = "";
        } else {
          const activeTab = mobileTabs.querySelector(".mobile-tab.active");
          switchTab(activeTab ? activeTab.dataset.tab : "editor");
        }
      }, 100);
    });
  }

  // ============================================================
  //  INIT
  // ============================================================
  checkConsent();
  checkPro();
  load();
  updatePreview();
})();
