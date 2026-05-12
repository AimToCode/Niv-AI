// ============================================
// Nivaran — translate.js: Language detection UI
// ============================================

export const LANG_TO_SPEECH = {
  'hi': 'hi-IN', 'en': 'en-IN', 'bn': 'bn-IN', 'te': 'te-IN',
  'mr': 'mr-IN', 'ta': 'ta-IN', 'ur': 'ur-PK', 'gu': 'gu-IN',
  'kn': 'kn-IN', 'or': 'or-IN', 'ml': 'ml-IN', 'pa': 'pa-IN',
  'as': 'as-IN', 'ne': 'ne-NP', 'hi-Latn': 'hi-IN',
  'kok': 'kok-IN', 'doi': 'hi-IN', 'sd': 'sd-PK',
  'mni': 'mni-IN', 'brx': 'hi-IN', 'sat': 'sat-IN', 'ks': 'ks-IN',
  'mai': 'hi-IN', 'sa': 'sa-IN',
};

export const LANG_PLACEHOLDERS = {
  'hi':      'अपनी समस्या यहाँ लिखें...',
  'en':      'Apni samasya yahan likhein... (Write your complaint here...)',
  'bn':      'আপনার সমস্যা এখানে লিখুন...',
  'te':      'మీ సమస్యను ఇక్కడ రాయండి...',
  'mr':      'तुमची समस्या येथे लिहा...',
  'ta':      'உங்கள் பிரச்சனையை இங்கே எழுதுங்கள்...',
  'ur':      'اپنی مشکل یہاں لکھیں...',
  'gu':      'તમારી સમસ્યા અહીં લખો...',
  'kn':      'ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ...',
  'ml':      'നിങ്ങളുടെ പ്രശ്നം ഇവിടെ എഴുതുക...',
  'pa':      'ਆਪਣੀ ਸਮੱਸਿਆ ਇੱਥੇ ਲਿਖੋ...',
  'or':      'ଆପଣଙ୍କ ସମସ୍ୟା ଏଠାରେ ଲିଖନ୍ତୁ...',
  'as':      'আপোনাৰ সমস্যা ইয়াত লিখক...',
  'ne':      'आफ्नो समस्या यहाँ लेख्नुहोस्...',
  'mai':     'अपन समस्या एतय लिखू...',
  'sa':      'स्वस्य समस्यां अत्र लिखतु...',
  'kok':     'तुमची तक्रार हांगा बरयात...',
  'doi':     'आपनी शिकायत एत्थे लिखो...',
  'sd':      'پنهنجي شڪايت هتي لکو...',
  'mni':     'ꯑꯩꯈꯣꯢꯒꯤ ꯁꯤꯖꯤꯟꯅꯔꯤꯕꯒꯤ ꯂꯩꯈꯋꯥꯏ...',
  'brx':     'नोंनि फोरमाय एथाय लिख...',
  'sat':     'ᱟᱯᱣᱟᱜ ᱯᱷᱩᱰᱽ ᱮᱛᱟᱱ ᱚᱞᱚᱜ...',
  'ks':      'اَپنِ شکایت اَتھ لِکھِو...',
  'hi-Latn': 'Apni samasya yahan likhein...',
};

// "Please enter one complaint at a time" — translated per language
export const LANG_ONE_COMPLAINT_MSG = {
  'hi':      'कृपया एक समय में केवल एक शिकायत दर्ज करें।',
  'en':      'Please enter one complaint at a time.',
  'bn':      'অনুগ্রহ করে একবারে একটি মাত্র অভিযোগ জমা দিন।',
  'te':      'దయచేసి ఒకేసారి ఒక ఫిర్యాదు మాత్రమే నమోదు చేయండి.',
  'mr':      'कृपया एका वेळी फक्त एकच तक्रार नोंदवा.',
  'ta':      'தயவுசெய்து ஒரு நேரத்தில் ஒரு புகாரை மட்டும் பதிவு செய்யவும்.',
  'ur':      'براہ کرم ایک وقت میں صرف ایک شکایت درج کریں۔',
  'gu':      'કૃપા કરી એક સમયે ફક્ત એક જ ફરિયાદ દાખલ કરો.',
  'kn':      'ದಯವಿಟ್ಟು ಒಂದು ಸಮಯದಲ್ಲಿ ಒಂದು ದೂರನ್ನು ಮಾತ್ರ ಸಲ್ಲಿಸಿ.',
  'ml':      'ദയവായി ഒരു സമയം ഒരു പരാതി മാത്രം സമർപ്പിക്കുക.',
  'pa':      'ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਸਮੇਂ ਵਿੱਚ ਸਿਰਫ਼ ਇੱਕ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰੋ।',
  'or':      'ଦୟାକରି ଏକ ସମୟରେ ଗୋଟିଏ ଅଭିଯୋଗ ଦାଖଲ କରନ୍ତୁ।',
  'as':      'অনুগ্ৰহ কৰি এবাৰত এটামাত্ৰ অভিযোগ দাখিল কৰক।',
  'ne':      'कृपया एक पटकमा एउटा मात्र उजुरी दर्ता गर्नुहोस्।',
  'mai':     'कृपया एक बेर मे एकटा शिकायत दर्ज करू।',
  'sa':      'कृपया एकस्मिन् समये एकमेव शिकायतं दर्ज कुर्वन्तु।',
  'kok':     'कृपया एका वेळार एकूच तक्रार नोंदयात.',
  'doi':     'किरपा करियै इक बारी च इक्को शिकायत दर्ज करो।',
  'sd':      'مهرباني ڪري هڪ وقت ۾ صرف هڪ شڪايت درج ڪريو.',
  'mni':     'ꯇꯨꯡꯒꯤ ꯑꯣꯏꯅꯥ ꯑꯃꯗꯝ ꯑꯃꯁꯨꯡ ꯄꯨꯛꯅꯤꯡ ꯁꯤꯖꯤꯟꯅꯔꯤꯕ ꯊꯕꯛ ꯄꯨꯔꯛꯍꯟꯂꯨ।',
  'brx':     'सुबुं एबा एबाय फोरमाय लिखो।',
  'sat':     'ᱫᱟᱭᱟᱠᱟᱛᱮ ᱢᱤᱫ ᱵᱮᱞᱟᱨ ᱢᱤᱫ ᱠᱷᱚᱱ ᱯᱷᱩᱰᱽ ᱫᱟᱠᱷᱤᱞ ᱢᱮ।',
  'ks':      'مہربانی کٔرِتھ ییک وقتس مَنز ییک ہِے شکایت دَرج کٔرِو۔',
  'hi-Latn': 'Kripya ek samay mein ek hi shikayat darj karein.',
};

// Update textarea placeholder and one-complaint alert when language changes
const langSelect = document.getElementById('lang-select');
const textarea   = document.getElementById('complaint-text');
const oneComplaintMsg = document.getElementById('one-complaint-msg');

function applyLang(lang) {
  if (textarea) {
    const placeholder = LANG_PLACEHOLDERS[lang] || LANG_PLACEHOLDERS['en'];
    textarea.placeholder = placeholder;
    // RTL support for Urdu, Sindhi, Kashmiri
    const rtlLangs = ['ur', 'sd', 'ks'];
    textarea.dir = rtlLangs.includes(lang) ? 'rtl' : 'ltr';
  }

  if (oneComplaintMsg) {
    const msg = LANG_ONE_COMPLAINT_MSG[lang] || LANG_ONE_COMPLAINT_MSG['en'];
    oneComplaintMsg.textContent = msg;
    // Mirror RTL for the alert too
    const rtlLangs = ['ur', 'sd', 'ks'];
    oneComplaintMsg.dir = rtlLangs.includes(lang) ? 'rtl' : 'ltr';
  }
}

if (langSelect) {
  langSelect.addEventListener('change', () => applyLang(langSelect.value));
  // Apply on load for whichever language is selected by default
  applyLang(langSelect.value);
}
