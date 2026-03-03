const fs = require('fs');
const file = 'd:/whatsapp-application/app/[locale]/(dashboard)/chat/[[...contactId]]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const startMarker = '            {/* \u2500\u2500 Input Bar \u2500\u2500 */}';
const endMarker = '            </form>';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx) + endMarker.length;

const newInputBar = `            {/* \u2500\u2500 Input Bar \u2500\u2500 */}
            <form onSubmit={handleSend} className="bg-white border-t border-slate-100 px-3 py-2.5">
              <div className="flex items-center gap-2">

                {/* \u2500\u2500 Pill input wrapper \u2500\u2500 */}
                <div className="flex-1 flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5 border border-slate-200 focus-within:border-emerald-400 focus-within:bg-white transition-all min-w-0">

                  {/* Emoji picker trigger */}
                  <div className="relative flex-shrink-0" ref={emojiRef}>
                    <button
                      type="button"
                      onClick={() => { setShowEmojiPicker(p => !p); setShowAttachMenu(false); }}
                      className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-yellow-500 transition-colors rounded-full hover:bg-slate-200 text-lg leading-none"
                      title="Emoji"
                    >
                      &#x1F642;
                    </button>

                    {/* Emoji popup */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-10 left-0 z-30 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 w-72">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Emojis</p>
                        <div className="grid grid-cols-10 gap-0.5 max-h-48 overflow-y-auto">
                          {[
                            "\u{1F600}","\u{1F601}","\u{1F602}","\u{1F603}","\u{1F604}","\u{1F605}","\u{1F606}","\u{1F929}","\u{1F970}","\u{1F609}",
                            "\u{1F60A}","\u{1F607}","\u{1F923}","\u{1F60E}","\u{1F913}","\u{1F614}","\u{1F615}","\u{1F616}","\u{1F62D}","\u{1F631}",
                            "\u{1F621}","\u{1F92C}","\u{1F624}","\u{1F64F}\uFE0F","\u{1F44D}","\u{1F44E}","\u{1F44F}","\u{1F44B}","\u{1F91D}","\u{1F49D}",
                            "\u2764\uFE0F","\u{1F494}","\u{1F49A}","\u{1F49B}","\u{1F499}","\u{1F4AF}","\u{1F525}","\u2B50","\u{1F31F}","\u2728",
                            "\u{1F389}","\u{1F388}","\u{1F381}","\u{1F380}","\u{1F384}","\u{1F3C6}","\u{1F947}","\u{1F948}","\u{1F949}","\u{1F4B0}",
                            "\u{1F4F1}","\u{1F4BB}","\u{1F5A5}\uFE0F","\u2328\uFE0F","\u{1F5A8}\uFE0F","\u{1F4F7}","\u{1F3A5}","\u{1F4E7}","\u{1F4DE}","\u{1F514}",
                            "\u{1F355}","\u{1F697}","\u2708\uFE0F","\u{1F680}","\u{1F6A2}","\u{1F682}","\u{1F6B2}","\u{1F3C3}","\u{1F6B6}","\u{1F3CA}",
                            "\u{1F436}","\u{1F431}","\u{1F42D}","\u{1F427}","\u{1F981}","\u{1F42E}","\u{1F437}","\u{1F435}","\u{1F434}","\u{1F422}",
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
                    )}
                  </div>

                  {/* Text input */}
                  <input
                    ref={textInputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={selectedFile ? \`\u2709\uFE0F Ready to send \${selectedFileType}\u2026\` : t("typeMessage")}
                    disabled={!!selectedFile}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 disabled:opacity-60 min-w-0 py-1"
                  />

                  {/* Paperclip attach menu trigger */}
                  <div className="relative flex-shrink-0" ref={attachRef}>
                    <button
                      type="button"
                      onClick={() => { setShowAttachMenu(p => !p); setShowEmojiPicker(false); }}
                      className={cn(
                        "w-7 h-7 flex items-center justify-center transition-colors rounded-full hover:bg-slate-200",
                        showAttachMenu ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-emerald-600"
                      )}
                      title="Attach file"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </button>

                    {/* Attach popup \u2014 2\xd72 grid */}
                    {showAttachMenu && (
                      <div className="absolute bottom-10 right-0 z-30 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 w-52">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2.5">Send attachment</p>
                        <div className="grid grid-cols-2 gap-2">

                          {/* Image */}
                          <label className="flex flex-col items-center gap-2 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 cursor-pointer transition-all border border-emerald-100 hover:border-emerald-300">
                            <span className="text-2xl">\u{1F4F7}</span>
                            <span className="text-[11px] font-semibold text-emerald-700">Image</span>
                            <input ref={imageInputRef} type="file" className="hidden" accept="image/*"
                              onChange={(e) => { handleFileSelect(e, "image"); setShowAttachMenu(false); }} />
                          </label>

                          {/* Video */}
                          <label className="flex flex-col items-center gap-2 p-3 rounded-xl bg-rose-50 hover:bg-rose-100 cursor-pointer transition-all border border-rose-100 hover:border-rose-300">
                            <span className="text-2xl">\u{1F3AC}</span>
                            <span className="text-[11px] font-semibold text-rose-600">Video</span>
                            <input ref={videoInputRef} type="file" className="hidden" accept="video/*"
                              onChange={(e) => { handleFileSelect(e, "video"); setShowAttachMenu(false); }} />
                          </label>

                          {/* Audio */}
                          <label className="flex flex-col items-center gap-2 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 cursor-pointer transition-all border border-purple-100 hover:border-purple-300">
                            <span className="text-2xl">\u{1F3B5}</span>
                            <span className="text-[11px] font-semibold text-purple-600">Audio</span>
                            <input ref={audioInputRef} type="file" className="hidden" accept="audio/*"
                              onChange={(e) => { handleFileSelect(e, "audio"); setShowAttachMenu(false); }} />
                          </label>

                          {/* Document */}
                          <label className="flex flex-col items-center gap-2 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 cursor-pointer transition-all border border-blue-100 hover:border-blue-300">
                            <span className="text-2xl">\u{1F4C4}</span>
                            <span className="text-[11px] font-semibold text-blue-600">Document</span>
                            <input ref={docInputRef} type="file" className="hidden"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                              onChange={(e) => { handleFileSelect(e, "document"); setShowAttachMenu(false); }} />
                          </label>

                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Mic when idle | Stop when recording | Send when text/file ready */}
                {!text.trim() && !selectedFile && !recording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 transition-all shadow-sm text-lg"
                    title="Record voice"
                  >
                    \u{1F399}\uFE0F
                  </button>
                ) : recording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white animate-pulse shadow-lg shadow-red-200 text-lg"
                    title="Stop recording"
                  >
                    \u23F9
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={sending || uploading}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-40 transition-all shadow-sm"
                    title="Send"
                  >
                    {sending || uploading ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 translate-x-0.5">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>

              {/* Recording indicator */}
              {recording && (
                <div className="flex items-center gap-2 mt-2 px-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                  <span className="text-xs text-red-600 font-medium">Recording\u2026 tap \u23F9 to stop and send</span>
                </div>
              )}
            </form>`;

content = content.substring(0, startIdx) + newInputBar + content.substring(endIdx);
fs.writeFileSync(file, content, 'utf8');
console.log('Done! File updated successfully. New length:', content.length);
