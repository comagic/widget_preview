Comagic.UI.registerViewController('consultant', function (settings, tpls) {
    var newWidgets = function () {
            var widgetsName = Array.prototype.slice.call(arguments);
            var internalWidgets = {
                do: function (methodName, params, context) {
                    (context || widgetsName).forEach(function (widgetName) {
                        if (widgetName === 'rack' && methodName === 'render') {
                            var renderTo = internalWidgets[widgetName].getRenderTo(),
                                el = renderTo.querySelector('.comagic-o-rack--' + settings.chat.h_position + '.comagic-o-rack--' + settings.chat.v_position);
                            if (el) {
                                internalWidgets[widgetName].attachEl(el);
                                return;
                            }
                        }
                        internalWidgets[widgetName][methodName].apply(internalWidgets[widgetName], params);
                    });
                }
            };
            widgetsName.forEach(function (name) {
                internalWidgets[name] = Comagic.UI.createWidget(name, {
                    isOpenWithVisibilityObserver: true,
                    settings: settings,
                    tpl: tpls[name],
                    getHelperSelector: function () {
                        return 'comagic-js-' + this.name.replace(new RegExp('_', 'g'), '-');
                    },
                    show: function (isApi) {
                        var me = this;
                        if (isApi) {
                            visibilityObserver.pub(name);
                            return false;
                        } else {
                            setTimeout(function () {
                                me.getEl().classList.remove(me.getHelperSelector() + '--hidden');
                                me.getEl().classList.add(me.getHelperSelector() + '--shown');
                            }, 0);
                        }
                    },
                    hide: function () {
                        this.getEl().classList.remove(this.getHelperSelector() + '--shown');
                        this.getEl().classList.add(this.getHelperSelector() + '--hidden');
                    }
                });
            });

            return internalWidgets;
        },
        widgets = newWidgets('consultant_label', 'rack', 'consultant_chat', 'consultant_offline_message', 'consultant_chat_group_selector'),
        renderToBodyWidgets = ['rack', 'consultant_chat', 'consultant_offline_message'],
        renderToConsultantLabelsPlaceWidgets = ['consultant_label'],
        extremeMessageWidget = {
            last: null,
            first: null
        },
        addBotEmailMessage = getAddMessageFn({
            name: 'email_message',
            sender: 'bot'
        }),
        addBotVCardMessage = getAddMessageFn({
            name: 'vcard_message',
            sender: 'bot'
        }),
        addBotRatingMessage = getAddMessageFn({
            name: 'rating_message',
            sender: 'bot'
        }),
        addBotRetentionBtnMessage = getAddMessageFn({
            name: 'retention_btn_message',
            sender: 'bot'
        }),
        addHistoryMessage = getAddMessageFn({
            name: 'message',
            isHistoryMode: true
        }),
        addMessage = getAddMessageFn({
            name: 'message'
        }),
        typingTimer,
        isVcardChoice,
        visibilityObserver;

    function rulesReducer(action) {
        var isVisibleChat = settings.chat.is_visible && widgets['consultant_chat'].isChatAvailable(),
            isVisibleOfflineMessage = settings.offline_message.is_visible
                && (!settings.chat.is_visible
                    ? true
                    : !widgets['consultant_chat'].isChatAvailable());
        return {
            consultant_label: (function () {
                var isVisibleConsultantLabel = isVisibleChat || isVisibleOfflineMessage;
                switch (action) {
                    case 'simple_sitephone':
                    case 'rack':
                        return isVisibleConsultantLabel;
                    default:
                        return false;
                }
            })(),
            consultant_chat_label_icon: isVisibleChat,
            rack: true,
            consultant_chat_group_selector: (function () {
                switch (action) {
                    case 'consultant_chat':
                    case 'consultant_chat_group_selector':
                        return settings.chat.is_groups_enabled
                            && widgets['consultant_chat'].getState() === 'available'
                            && !getCurrentGroupdId()
                            && !isVcardChoice;
                    default:
                        return false
                }
            })(),
            consultant_chat: (function () {
                switch (action) {
                    case 'consultant_chat':
                        return true;
                    default:
                        return false
                }
            })(),
            consultant_offline_message: action === 'consultant_offline_message'
        };
    }

    function updateVisibility(rules) {
        for (var wName in rules) {
            if (rules.hasOwnProperty(wName)) {
                if (widgets[wName]) {
                    if (rules[wName]) {
                        !widgets[wName].isVisible() && widgets[wName].show();
                    } else {
                        widgets[wName].isVisible() && widgets[wName].hide();
                    }
                }
            }
        }
    }

    function updateVisibilityIcons(rules) {
        if (rules.consultant_chat_label_icon) {
            widgets['consultant_label'].getEl().classList.add('comagic-js-consultant-label--chat');
            widgets['consultant_label'].getEl().classList.remove('comagic-js-consultant-label--offline-message');
        } else {
            widgets['consultant_label'].getEl().classList.add('comagic-js-consultant-label--offline-message');
            widgets['consultant_label'].getEl().classList.remove('comagic-js-consultant-label--chat');
        }
    }

    function hasLogScroll() {
        return (widgets['consultant_chat'].refs['log'].scrollHeight > widgets['consultant_chat'].refs['log'].offsetHeight)
    }

    function scrollLogBottom() {
        widgets['consultant_chat'].refs['log'].scrollTop = widgets['consultant_chat'].refs['log'].scrollHeight;
    }

    function updateUnreadCounter() {
        widgets['consultant_label'].refs['counter'].innerHTML = widgets['consultant_chat'].getUnreadCounter() || '';
    }

    function afterSubmit(config) {
        var widget = Comagic.UI.getWidget(config.widgetName);
        return function (answer) {
            var className = config.feedbackClassName || 'comagic-js-show-feedback--' + (answer.success ? 'success' : 'failure');
            if (widget.refs['content']) {
                widget.refs['content'].classList.add(className);
                if (answer.info) {
                    widget.refs['feedbackTitle'].innerHTML = answer.info.title;
                    widget.refs['feedbackMessage'].innerHTML = answer.info.message;
                }
            }

            window.setTimeout(function () {
                if (config.doAfterSubmit) {
                    config.doAfterSubmit(answer);
                }
                if (config.isClear) {
                    widget.refs['content'].classList.remove(className);
                }
            }, 3000);
        }
    }

    function createMessageWidget(name, messageSettings) {
        var CONSULTANT_MESSAGE_HIDDEN_CLS = 'comagic-js-consultant-message--hidden';
        return Comagic.UI.createWidget(name, {
                settings: messageSettings,
                tpl: tpls[name],
                show: function () {
                    var me = this;
                    setTimeout(function () {
                        me.getEl().classList.remove(CONSULTANT_MESSAGE_HIDDEN_CLS);
                    }, 1);
                }
            });
    }

    function wrapMessageSettings(config, messageSettings) {
        messageSettings.sender = config.sender || messageSettings.sender;
        messageSettings.v_position = settings.chat.v_position;
        messageSettings.h_position = settings.chat.h_position;
        return messageSettings;
    }

    function isFileMessage(messageSettings) {
        return !!messageSettings.fx_link;
    }

    function getMessageWidgetName(config, messageSettings) {
        var type = '_';
        if (isFileMessage(messageSettings)) type += 'file_';
        return 'consultant_chat_' + messageSettings.sender + type + config.name;
    }

    function getAddMessageFn(config) {
        var isHistoryMode = config.isHistoryMode,
            _config = config;

        return function (messageSettings) {
            var currentMessageWidget,
                log = widgets['consultant_chat'].refs['log'],
                name;

            messageSettings = wrapMessageSettings(_config, messageSettings);
            name = getMessageWidgetName(_config, messageSettings);
            currentMessageWidget = createMessageWidget(name, messageSettings);
            currentMessageWidget.render(log, isHistoryMode && log.firstChild);

            if (isHistoryMode) {
                if (extremeMessageWidget['last']
                    && extremeMessageWidget['last'].settings.sender === messageSettings.sender) {
                    currentMessageWidget.getEl().classList.remove('comagic-js-last-message');
                }
                extremeMessageWidget['last'] = currentMessageWidget;
            } else {
                if (extremeMessageWidget['first']
                    && extremeMessageWidget['first'].settings.sender === messageSettings.sender) {
                    extremeMessageWidget['first'].getEl().classList.remove('comagic-js-last-message');
                }
                extremeMessageWidget['first'] = currentMessageWidget;
            }

            currentMessageWidget.show();

            if (widgets['consultant_chat'].isVisible() && messageSettings.sender === 'operator') {
                widgets['consultant_chat'].clearUnreadCounter();
            }

            if (!isHistoryMode) {
                if (hasLogScroll()) {
                    scrollLogBottom();
                }
            }

            return currentMessageWidget;
        };
    }

    function toggleReadyForSend(isReadyForSend) {
        widgets['consultant_chat'].refs['messageEditor'].classList[isReadyForSend ? 'add' : 'remove']('comagic-js-messages-editor--ready-for-send');
    }

    function checkVCardInfoAndSendVisitorMessage() {
        if (!!widgets['consultant_chat'].getRequiredInfo().length) {
            requestVCardInfoAndRun(sendVisitorMessage);
        } else {
            sendVisitorMessage()
        }
    }

    function sendVisitorMessage() {
        var _creatorEl = widgets['consultant_chat'].refs['messageCreator'],
            _text = !!_creatorEl && _creatorEl.innerText.trim() || '';
        if (_text) {
            addMessage(widgets['consultant_chat'].sendChatMessage(_text, getCurrentGroupdId()));
            if (widgets['consultant_chat'].getState() === 'invite') {
                widgets['consultant_chat'].inviteAccept();
            }
        }
        _creatorEl.innerHTML = '';
        toggleReadyForSend(false);
    }

    function messageAreaDisabled() {
        widgets['consultant_chat'].refs['messageEditor'].classList.add('comagic-js-messages-editor--disabled');
        widgets['consultant_chat'].refs['messageCreator'].setAttribute('contenteditable', false);
    }

    function messageAreaEnabled() {
        widgets['consultant_chat'].refs['messageEditor'].classList.remove('comagic-js-messages-editor--disabled');
        widgets['consultant_chat'].refs['messageCreator'].setAttribute('contenteditable', true);
    }

    function requestVCardInfoAndRun(cb) {
        var messageWidget = addBotVCardMessage({chat: settings.chat, sender: 'bot'});
        isVcardChoice = true;

        messageAreaDisabled();
        messageWidget.refs['submitBtn'].addEventListener('click', function () {
            if (!messageWidget.getErrors()) {
                widgets['consultant_chat'].setVisitorCard(messageWidget.getValues(), function () {
                    messageWidget.refs['content'].classList.add('comagic-js-show-feedback');
                    messageAreaEnabled();
                    isVcardChoice = false;
                    cb();
                });
            }
        });
    }

    function clearCurrentGroupId() {
        setCurrentGroupdId(null);
    }

    function setCurrentGroupdId(newGroupId) {
        Comagic.storage.setItem('_cmg_current_group_id', newGroupId);
    }

    function getCurrentGroupdId() {
        return Comagic.storage.getItem('_cmg_current_group_id');
    }

    widgets.do('render', null, renderToBodyWidgets);
    widgets.do('render', [widgets['rack'].getEl()], renderToConsultantLabelsPlaceWidgets);
    widgets.do('render', [widgets['consultant_chat'].refs['groupSelector']], ['consultant_chat_group_selector']);

    //offline message
    widgets['consultant_label'].refs['triggerOfflineMessage'].addEventListener('click', function () {
        visibilityObserver.pub('consultant_offline_message');
    });
    widgets['consultant_offline_message'].on('sendofflinerequest', afterSubmit({
        widgetName: 'consultant_offline_message',
        isClear: true,
        doAfterSubmit: function () {
            visibilityObserver.pub('rack');
        }
    }));
    widgets['consultant_offline_message'].refs['closeBtn'].addEventListener('click', function () {
        visibilityObserver.pub('rack');
    });
    widgets['consultant_offline_message'].refs['submitBtn'].addEventListener('click', function () {
        if (!widgets['consultant_offline_message'].getErrors()) {
            widgets['consultant_offline_message'].sendRequest(widgets['consultant_offline_message'].getValues());
        }
    });

    //chat
    if (widgets['consultant_chat'].getState() === 'available') {
        clearCurrentGroupId();
    }

    if (settings.chat.is_groups_enabled) {
        widgets['consultant_chat_group_selector'].refs['groups'].forEach(function (groupEl) {
            groupEl.addEventListener('click', function (event) {
                setCurrentGroupdId(event.target.dataset.groupId);
                visibilityObserver.pub('consultant_chat');
            });
        });
        widgets['consultant_chat_group_selector'].on('show', function () {
            toggleVisibilityEmailBtn(true);
            setHeaderTitleText(settings.chat.group_title);
        });
        widgets['consultant_chat_group_selector'].on('hide', function () {
            toggleVisibilityEmailBtn(false);
            setHeaderTitleText(settings.chat.title);
        })
    }
    widgets['consultant_label'].on('show', updateUnreadCounter);
    widgets['consultant_label'].refs['triggerChat'].addEventListener('click', function () {
        visibilityObserver.pub('consultant_chat');
    });
    widgets['consultant_chat'].refs['closeBtn'].addEventListener('click', function () {
        visibilityObserver.pub('rack');
        if (widgets['consultant_chat'].getState() === 'invite') {
            widgets['consultant_chat'].inviteReject();
        }
    });

    widgets['consultant_chat'].on('messageviewed', updateUnreadCounter);
    widgets['consultant_chat'].on('show', function () {
        if (widgets['consultant_chat'].getState() !== 'available') {
            widgets['consultant_chat'].clearUnreadCounter();
        }
        if (hasLogScroll()) {
            scrollLogBottom();
        }
    });

    widgets['consultant_chat'].refs['soundBtn'].addEventListener('click', function () {
        var isDisabled = widgets['consultant_chat'].refs['soundBtn'].classList.toggle('comagic-js-sound-btn-off');
        Comagic.storage.setItem('_cmg_sound_disabled', isDisabled);
    });

    widgets['consultant_chat'].refs['printBtn'].addEventListener('click', function () {
        widgets['consultant_chat'].printCurrentChat()
    });

    widgets['consultant_chat'].refs['emailBtn'].addEventListener('click', function () {
        var messageWidget = addBotEmailMessage(Comagic.UI.C.MESSAGES_SETTINGS['email']);
        messageWidget.refs['submitBtn'].addEventListener('click', function () {
            if (!messageWidget.getErrors()) {
                Comagic.sendChatByMail(messageWidget.getValues(), afterSubmit({
                    feedbackClassName: 'comagic-js-show-feedback',
                    widgetName: 'consultant_chat_bot_email_message'
                }));
            }
        });
    });

    widgets['consultant_chat'].refs['ratingBtn'] && widgets['consultant_chat'].refs['ratingBtn'].addEventListener('click', function () {
        var messageW = addBotRatingMessage(widgets['consultant_chat'].getOperatorVcard() || {sender: 'bot'});

        messageW.refs['thumbsUpBtn'].addEventListener('click', function () {
            widgets['consultant_chat'].setOperatorRating(5);
            messageW.refs['content'].classList.add('comagic-js-show-feedback');
        });

        messageW.refs['thumbsDownBtn'].addEventListener('click', function () {
            widgets['consultant_chat'].setOperatorRating(1);
            messageW.refs['content'].classList.add('comagic-js-show-feedback');
        });

        toggleVisibilityRatingBtn(true);
    });

    function toggleVisibilityBtn(btnName, isHidden) {
        widgets['consultant_chat'].refs[btnName].classList[isHidden ? 'add' : 'remove']('comagic-js-btn-hidden');
    }

    function toggleVisibilityRatingBtn(isHidden) {
        toggleVisibilityBtn('ratingBtn', isHidden);
    }

    function toggleVisibilityEmailBtn(isHidden) {
        toggleVisibilityBtn('emailBtn', isHidden);
    }

    function setHeaderTitleText(text) {
        widgets['consultant_chat'].refs['headerTitle'].innerHTML = text;
    }

    function isAllowedKey(e) {
        var allowedKeys = [8, 13, 37, 38, 39, 40, 46],
            isAllowKey = false;
        if (allowedKeys.indexOf(e.which) !== -1 || allowedKeys.indexOf(e.keyCode) !== -1) {
            isAllowKey = true;
        }
        return isAllowKey;
    }

    function setCursorPosition(el, position) {
        if (el.childNodes[0]) {
            var childNode = el.childNodes[0];
            if (childNode && childNode.length >= position) {
                var range = window.document.createRange(),
                    selection = window.getSelection();
                range.setStart(childNode, position);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }

    widgets['consultant_chat'].refs['messageCreator'].addEventListener('paste', function (e) {
        var creatorEl = this,
            max = creatorEl.getAttribute('c-max'),
            data;

        if (window.clipboardData) {
            data = window.clipboardData.getData('Text');
        } else {
            data = e.clipboardData.getData('text/plain');
        }

        data = creatorEl.innerText + data;

        if (data >= max) {
            creatorEl.innerText = data.slice(0, max);
        } else {
            creatorEl.innerText = data;
        }
        setCursorPosition(creatorEl, creatorEl.innerText.length);
        creatorEl.scrollTop = 10000;
        e.preventDefault();
    });

    widgets['consultant_chat'].refs['messageCreator'].addEventListener('keydown', function (e) {
        var creatorEl = this;
        if (!e.ctrlKey && !isAllowedKey(e)) {
            if (creatorEl.innerText.length >= creatorEl.getAttribute('c-max')) {
                e.preventDefault();
                return false;
            }
        }
        widgets['consultant_chat'].chatTyping(creatorEl.textContent || '');
        if ((e.which === 13 || e.keyCode === 13) && !e.shiftKey) {
            checkVCardInfoAndSendVisitorMessage();
            e.preventDefault();
        }
    });
    widgets['consultant_chat'].refs['messageCreator'].addEventListener('keyup', function () {
        var creatorEl = this;
        toggleReadyForSend(creatorEl.innerHTML.length > 0);
    });
    widgets['consultant_chat'].refs['textPusher'].addEventListener('click', checkVCardInfoAndSendVisitorMessage);
    widgets['consultant_chat'].refs['filePusher'].addEventListener('change', function () {
        if (widgets['consultant_chat'].getState() === 'invite') {
            widgets['consultant_chat'].inviteAccept();
        }
        widgets['consultant_chat'].sendFile(this);
    });

    widgets['consultant_chat'].on('ratingchange', function (mark) {
        toggleVisibilityRatingBtn(!!mark);
    });
    widgets['consultant_chat'].on('chatavailabilitychange', function () {
        if (!widgets['consultant_chat'].isVisible()
            && !widgets['consultant_offline_message'].isVisible()) {
            visibilityObserver.pub('rack');
        }
    });

    widgets['consultant_chat'].on('showchatretentionaction', function (messages) {
        var messageW = addBotRetentionBtnMessage(Comagic.UI.C.RETENTION_BUTTONS_SETTINGS[messages.alternate_communication_way]);
        messageW.refs['submitBtn'].addEventListener('click', function () {
            widgets['consultant_chat'].closeChat(function () {
                if (messages.alternate_communication_way === 'sitephone') {
                    Comagic.openSitePhonePanel();
                } else if (messages.alternate_communication_way === 'chat') {
                    clearCurrentGroupId();
                    Comagic.openChatWindow();
                } else if (messages.alternate_communication_way === 'offline_message') {
                    Comagic.openSiteRequestPanel();
                }
            });
        });
    });

    widgets['consultant_chat'].on('showhistory', function (messages) {
        var message = null;
        while (messages.length) {
            message = messages.shift();
            addMessage(message);
        }
    });

    widgets['consultant_chat'].on('sendmessage', function (message) {
        if (message.sender === 'operator') {
            widgets['consultant_chat'].refs['typingIndicator'].classList.remove('comagic-js-is-typing');
            if (!Comagic.storage.getItem('_cmg_sound_disabled')) {
                widgets['consultant_chat'].refs['soundControl'].play();
            }
        }
        addMessage(message);
        updateUnreadCounter();
    });

    widgets['consultant_chat'].refs['log'].addEventListener('scroll', function (e) {
        var logEl = widgets['consultant_chat'].refs['log'], history, i, prevScroll;
        if (logEl.scrollTop === 0) {
            history = widgets['consultant_chat'].getHistory();
            prevScroll = logEl.scrollHeight;
            if (history) {
                for (i = 0; i < history.length; i++) {
                    addHistoryMessage(history[i]);
                }
                logEl.scrollTop = logEl.scrollHeight - prevScroll;
                e.preventDefault();
            }
        }
    });

    widgets['consultant_chat'].on('chattyping', function () {
        clearTimeout(typingTimer);
        widgets['consultant_chat'].refs['typingIndicator'].classList.add('comagic-js-is-typing');
        typingTimer = setTimeout(function () {
            widgets['consultant_chat'].refs['typingIndicator'].classList.remove('comagic-js-is-typing');
        }, 5000);
    });

    widgets['consultant_chat'].on('statechange', function (state) {
        switch (state) {
            case 'chat':
            case 'invite':
                visibilityObserver.pub('consultant_chat');
                break;
        }
    });

    widgets['consultant_chat'].on('invite', function (message) {
        if (settings.chat.is_visible && message.sender === 'operator') {
            setTimeout(function () {
                visibilityObserver.pub('consultant_chat');
                if (!Comagic.storage.getItem('_cmg_sound_disabled')) {
                    widgets['consultant_chat'].refs['soundControl'].play();
                }
                addMessage(message);
            }, 1);
        }
    });

    //set visibility props
    visibilityObserver = Comagic.UI.createObserver(rulesReducer);
    visibilityObserver.sub(updateVisibility);
    visibilityObserver.sub(updateVisibilityIcons);
    visibilityObserver.pub('hide_all');
    visibilityObserver.pub('rack');

    Comagic.on('sleep', function () {
        visibilityObserver.pub('hide_all');
    })
});
