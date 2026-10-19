# NetCommand Hub - User Guide

A plain-language guide for network engineers, students and IT support staff.

NetCommand Hub is a searchable **command library** and **configuration generator** for **Cisco, Dell, Huawei and Fortinet**. It shows you the right command for the right vendor, platform and OS, explains it, lets you fill in your own values safely, and gives you text to copy or download.

> **Important:** the app only produces *text*. It never connects to a device, never logs in, never changes anything on your network, and stores no device passwords. You review the text and apply it yourself, following your organisation's change-control process.

To install and start the app, see [APP_START_GUIDE.md](APP_START_GUIDE.md).

---

## 1. Read this first: the labels

Every command/template carries three kinds of label. Learn them once and the whole app makes sense.

### Platform and compatibility

Each entry names its **vendor**, **platform (OS family)** and, when known, **version range** - for example `Cisco · Cisco IOS-XE · version not verified`.

- Syntax is **never** shared between platforms. A Cisco NX-OS template is not offered under IOS-XE, and Dell OS6, OS9 and OS10 are three separate platforms.
- "version not verified" means no version range has been confirmed. Read the **Compatibility** note on the detail page.

### Verification status

| Label | Meaning |
|---|---|
| **? Unverified** | Syntax and compatibility have **not** been confirmed by a reviewer or a lab test. |
| **✓ Reviewed** | A maintainer checked it against cited documentation. Not a guarantee it is safe in production. |
| **✓✓ Lab-tested** | Tested in a named lab environment on a stated platform and version. |
| **! Needs review** | A review is outdated or a problem was reported. |
| **✎ Draft** | Not ready for general use. |

**Right now only 4 bundled templates are Reviewed (Cisco IOS-XE: create VLAN, access port, trunk port, SVI - documentation check on Catalyst 9300, 17.9) and the other 118 are Unverified.** Treat all of them as starting points to check against the vendor's documentation and test in a lab.

Status is shown with a symbol *and* a word, never colour alone.

### Command type

| Type | Meaning |
|---|---|
| **Configuration** | Commands that change device configuration. |
| **Verification / show** | Read-only commands that display state. |
| **Operational (exec)** | Exec-mode actions such as save or back up. |

Configuration and verification commands are always shown in separate, differently labelled blocks.

---

## 2. Finding your way around

The **left sidebar** has nine pages. On a phone, tap the ☰ menu button to open it. The top bar has the global search box (press **/** to jump to it) and a theme button (dark / light).

| Page | What it is for |
|---|---|
| **Overview** | Start page: search, vendor cards, quick actions, popular categories, recently viewed and recently added templates. |
| **Command Library** | Search and filter all templates. |
| **Vendors** | Browse by vendor and platform; see compatibility caveats. |
| **Configuration Builder** | Fill in values and generate validated configuration text. |
| **Configuration Diff** | Compare two blocks of configuration text. |
| **Favourites** | Templates you starred. |
| **My Templates** | Create, edit, import and export your own templates. |
| **Glossary** | Plain explanations of VLAN, trunk, LACP, STP, OSPF, BGP, ACL, NAT, DHCP, SSH and more. |
| **Settings / About** | Theme, how your data is stored, label definitions, clear saved data. |

The sidebar can be collapsed to icons with the **Collapse** button at the bottom (desktop).

---

## 3. Task: find a command

1. Open **Command Library** (or type in the top search box and press **Enter**).
2. Type what you want to do, such as `configure access VLAN`, `OSPF neighbor`, `FortiGate IPsec VPN`, `Dell OS10 LAG`, `Huawei Eth-Trunk`, `Cisco SSH management` or `show interface errors`.
   - Search is not case-sensitive and matches parts of words.
   - **All** words you type must match somewhere (title, tags, summary, vendor/platform, category, command text or explanation).
3. Narrow the list with the filters:
   - **Vendor**, **Platform / OS**, **Category / task**, **Command type**, **Verification status**, **Difficulty**, **Version compatibility**.
   - Choosing a vendor limits the platform list to that vendor.
   - **Version compatibility** only shows entries with a recorded matching version. Because most entries have none yet, using it usually shows nothing - that is deliberate (the app will not guess).
   - The numbers in brackets are how many results each choice would give.
4. Change **Sort** to Relevance, Alphabetical, Recently reviewed or Recently added.
5. Active filters appear as chips - click a chip to remove it, or **Clear all**.
6. On a phone, filters open from the **Filters** button as a full-screen panel.
7. Use **Previous / Next** at the bottom for more results (12 per page).

Your filters are stored in the page address, so the Back button and bookmarks work.

**No results?** Use fewer words, check spelling, remove a filter, or check the platform filter - a result for another platform is never shown.

### Open a result

Click **Open details** (or the title). The detail page shows, in this order:

1. Title and purpose
2. Vendor / platform / version, verification badge, review date, compatibility note
3. Action buttons: ★ favourite, **Open in builder**, **Export .md**, **Export .txt**
4. Prerequisites
5. Configuration snippet (placeholders shown as `{{name}}`) with a **Copy template** button
6. Placeholder table (type, rules, example)
7. Line-by-line / block explanation
8. Expected outcome
9. Verification commands (separate block)
10. Rollback / recovery guidance
11. Warnings and operational impact
12. Related commands
13. Documentation and review information
14. Review reminder

---

## 4. Task: generate a configuration

1. Open **Configuration Builder**, or click **Open in builder** on any detail page (the template is pre-selected).
2. Choose **Vendor → Platform / OS → Template / task**.
3. Read the yellow **Compatibility** note and open **Prerequisites** if shown.
4. Fill in each field.
   - Grey text in the box is the example or default.
   - The line under each field explains the rule, e.g. *Whole number 1-4094* or *Subnet mask, e.g. 255.255.255.0*.
5. Press **Generate** (or **Enter**).
   - Mistakes show as a red message **under the field** and the cursor jumps to the first one. Nothing is generated until every field is valid.
6. Read the **Generated output** panel:
   - The configuration (highlighted, with line numbers, long lines scroll sideways),
   - **Verification commands** to run afterwards (with your values filled in),
   - **Placeholder summary**, **Warnings**, **Rollback** notes,
   - A **Pre-deployment checklist** you can tick off,
   - The template version and generation time.
7. After the first generation, the output **updates automatically** a moment after you edit a field. If a field becomes invalid the output dims and says *Fields changed - fix any errors to refresh this output*.
8. Use **Copy**, or **.txt / .cfg / .md** to download. The `.cfg` file is just text with that extension - **it is not a device backup.** The `.md` file includes metadata, values used, warnings and the version.
9. **Reset** clears the form and the output.

### What the checks allow

- IP addresses must be valid dotted IPv4; subnet masks and wildcard masks must be valid contiguous masks.
- VLAN lists look like `10,20,30-40` (IDs 1-4094).
- Free-text fields allow letters, digits, spaces and `. _ - : / , ( ) @ # +` only. Quotes, `! ? | ; & $ \` < >` and line breaks are blocked so a value can never add extra commands.
- Many name fields have stricter, platform-specific limits (for example FortiOS names up to 15 characters).

Values are checked on your computer for speed **and again by the server**.

### Show/diagnostic templates

Templates of type *Verification / show* with no fields (for example *Check routing table and protocols*) simply display their commands; copy them from the detail page.

---

## 5. Task: compare two configurations

1. Open **Configuration Diff**.
2. Paste the **Original** text on the left and the **Updated** text on the right (or press **Load sample** to try it).
3. Optional: tick **Ignore trailing whitespace** and/or **Ignore blank lines**. These only change how lines are *compared*; your text is never modified.
4. Press **Compare**.
5. The result lists every line with line numbers for both sides and a text label:
   - **Added** (green, `+`), **Removed** (red, `−`), **Unchanged**.
   - A summary shows the counts. If nothing differs, it says the inputs are identical.
6. **Copy diff**, **.txt** or **.md** export the result. **Swap** exchanges the two boxes; **Clear both** empties them.

Limits: 200,000 characters per box. This is a **plain text** comparison, not a network-aware validator - the same configuration written in a different order will show as changed.

**Privacy:** your pasted text goes only to the NetCommand Hub server running on your own computer. It is not sent anywhere else. Still, remove passwords and keys before pasting.

---

## 6. Task: favourites

- Click the ☆ star on any card or detail page to favourite it (★ = saved). Click again to remove.
- **Favourites** lists them with search and a vendor filter. The sidebar shows a count.
- Favourites are saved **in this browser only**. See section 9.

---

## 7. Task: create your own template

Use this for configuration you reuse. Personal templates are always labelled **Personal / Unverified** - you cannot mark your own as reviewed.

1. Open **My Templates → New template**.
2. Fill in Title, Difficulty, Vendor, Platform, Category, optional Tags, and a Description.
3. In **Configuration body**, type your commands. Write `{{name}}` wherever a value should be filled in later (names use lowercase letters, digits and `_`).
4. Press **Detect from body** to create a row for each `{{name}}`, then set each placeholder's **Type** (string, integer, enum, ipv4, ipv4_netmask, ipv4_wildcard, ipv4_cidr, vlan_list), label, example and limits:
   - integer: **Min** and **Max** are required.
   - enum: give a comma-separated list of options.
   - string: optional max length and an allowed pattern (regular expression).
5. Optionally add verification commands (one per line, may use `{{name}}`) and warnings.
6. Press **Validate and save**. The server checks everything and may show:
   - **Errors** (not saved), e.g. `{{x}}` used but not defined, or defined but unused.
   - **Warnings** (saved) such as markup-like text or what looks like a literal secret. **Do not put passwords, keys or SNMP communities in templates** - use a placeholder or set them on the device directly.
7. Use **Use in builder** on the saved card to generate output from it (Builder → *My templates* tab).
8. **Edit**, **Export** (one) or **Delete** (asks for confirmation) are on each card.

### Backup and sharing

- **Export all** downloads `netcommand-hub-my-templates.json`.
- **Import** reads such a file. Every template in it is re-validated; invalid ones are skipped and listed, duplicate or unsafe IDs are replaced with new ones, and everything imported becomes Personal / Unverified. Files over 1 MB or not in the NetCommand Hub format are rejected.

---

## 8. Glossary

Type in the search box to filter terms and their alternative names (for example *EtherChannel*, *Eth-Trunk* and *LAG* all lead to link aggregation).

---

## 9. Your data and privacy

- Favourites, recently viewed items, personal templates, theme and sidebar state are kept in your **browser's local storage**.
- There are **no accounts** and nothing is uploaded. Clearing browser data erases them; **Export all** first if you want a backup.
- Storage is per web address: `http://127.0.0.1:8000` and `http://localhost:8000` are different "sites". Use the same one each time.
- **Settings / About → Clear all saved data** removes favourites, history and personal templates (asks to confirm).

---

## 10. Keyboard and accessibility

| Key | Action |
|---|---|
| `/` | Focus the global search box |
| `Esc` | Close a dialog or the mobile menu |
| `Tab` / `Shift+Tab` | Move between controls (a "Skip to content" link appears first) |
| Arrow keys / `Tab` on a code block | Code panels are focusable and scroll sideways |

Focus is always visible, icon buttons have text labels for screen readers, status never relies on colour alone, and animations are turned off if your system asks for reduced motion.

---

## 11. Good practice checklist

Before you use any generated text:

1. Confirm your device model, platform and OS version match the template.
2. Read every line and the warnings.
3. Compare with the vendor's documentation for **your** version.
4. Test in a lab or have a rollback plan.
5. Take a configuration backup.
6. Get the change approved under your change-control process.
7. Save the configuration only when the result is verified (the *Save the running configuration* templates show how).

The builder's **Pre-deployment checklist** mirrors these steps.

---

## 12. FAQ

**Does it connect to my switch/firewall?** No. It never connects to any device.

**Is a template "official"?** No template is marked official, and currently only 4 are Reviewed (documentation check, see each page's evidence), none is Lab-tested, and the rest are Unverified.

**Why does the version filter show nothing?** No template has a verified version range yet, and the app will not pretend otherwise.

**Why are some fields rejected?** To make sure a value can never inject extra commands. See *What the checks allow*.

**Why is there a separate Cisco IOS and IOS-XE entry that looks identical?** They are listed separately so compatibility is explicit per platform; the text may match because the syntax is similar, but neither is verified.

**My Dell switch - which platform?** Pick the OS it runs: OS6 (N-Series/PowerConnect-era), OS9 (S/Z-Series, formerly FTOS) or OS10 (SmartFabric OS10). Check with `show version` on the device.

**Can I add my own vendor?** Not from the interface. Adding vendors/platforms/templates is done by editing the YAML files; see [TEMPLATE_AUTHORING_GUIDE.md](TEMPLATE_AUTHORING_GUIDE.md).
