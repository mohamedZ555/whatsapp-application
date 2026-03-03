const fs = require('fs');
const file = 'd:/whatsapp-application/app/[locale]/(dashboard)/chat/[[...contactId]]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add emoji-mart import after existing imports
const importInsertAfter = `import { createPortal } from "react-dom";`;
const emojiMartImport = `import { createPortal } from "react-dom";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";`;
content = content.replace(importInsertAfter, emojiMartImport);

// 2. Replace the entire emoji popup section (from {/* Emoji popup */} to closing </div> of emojiRef)
const oldEmojiPopup = `                    {/* Emoji popup */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-10 left-0 z-30 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 w-72">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Emojis</p>
                        <div className="grid grid-cols-10 gap-0.5 max-h-48 overflow-y-auto">
                          {[
                            "😀","😁","😂","😃","😄","😅","😆","🤩","🥰","😉",
                            "😊","😇","🤣","😎","🤓","😔","😕","😖","😭","😱",
                            "😡","🤬","😤","🙏️","👍","👎","👏","👋","🤝","💝",
                            "❤️","💔","💚","💛","💙","💯","🔥","⭐","🌟","✨",
                            "🎉","🎈","🎁","🎀","🎄","🏆","🥇","🥈","🥉","💰",
                            "📱","💻","🖥️","⌨️","🖨️","📷","🎥","📧","📞","🔔",
                            "🍕","🚗","✈️","🚀","🚢","🚂","🚲","🏃","🚶","🏊",
                            "🐶","🐱","🐭","🐧","🦁","🐮","🐷","🐵","🐴","🐢",
                          ].map((em) => (
                            <button
                              key={em}
                              type="button"
                              className="w-7 h-7 flex items-center justify-center text-xl hover:bg-slate-100 rounded-lg transition-colors"
                              onClick={() => {
                                setText(prev => prev + em);
                                textInputRef.current?.focus();
                                setShowEmojiPicker(false);
                              }}
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}`;

const newEmojiPopup = `                    {/* Emoji popup — emoji-mart (WhatsApp style) */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-10 left-0 z-30 drop-shadow-2xl">
                        <Picker
                          data={emojiData}
                          onEmojiSelect={(emoji: any) => {
                            setText(prev => prev + emoji.native);
                            textInputRef.current?.focus();
                            setShowEmojiPicker(false);
                          }}
                          theme="light"
                          set="apple"
                          previewPosition="none"
                          skinTonePosition="none"
                          navPosition="bottom"
                          perLine={8}
                          maxFrequentRows={2}
                        />
                      </div>
                    )}`;

if (content.includes(oldEmojiPopup)) {
  content = content.replace(oldEmojiPopup, newEmojiPopup);
  console.log('Emoji picker replaced successfully!');
} else {
  console.log('ERROR: Could not find old emoji popup section');
  // Try to find partial match
  const partialIdx = content.indexOf('{/* Emoji popup */}');
  console.log('Partial match at:', partialIdx);
}

fs.writeFileSync(file, content, 'utf8');
console.log('File saved. Length:', content.length);
