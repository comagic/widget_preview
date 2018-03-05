Comagic.UI.registerViewController('consultant', function (settings, tpls) {
    var widgetsFullSize = ['consultant_chat', 'consultant_offline_message'],
        isSleep = false,

        consultantLabelState,
        consultantInviteState,
        inviteMessageWidget,
        consultantInviteOperatorMessageState,

        labelsSize = 15,
        spaceBetweenLabels = 17,
        defaultMarginTop = 7,
        defaultMarginLeft = 7,
        closeBtnSize = 6,
        fontSize = 3,
        counterStyle = {
            width: 5,
            height: 5,
            fontSize: fontSize
        },
        consultantInviteStyle = {
            width: 70,
            minHeight: 15,
            maxHeight: 35,
            fontSize: fontSize
        },
        inAction = null,
        labelPosition = {
            top: settings.chat.v_position,
            left: settings.chat.h_position
        },
        middlePositionMargin = labelPosition.top === 'middle' ? labelsSize / 2 + defaultMarginTop : 0,
        inviteMiddlePositionMargin = labelPosition.top === 'middle' ? labelsSize + defaultMarginTop : 0,

        newWidgets = function () {
            var widgetsName = Array.prototype.slice.call(arguments);
            var internalWidgets = {
                do: function (methodName, params, context) {
                    (context || widgetsName).forEach(function (widgetName) {
                        internalWidgets[widgetName][methodName].apply(internalWidgets[widgetName], params);
                    });
                }
            };
            widgetsName.forEach(function (name) {
                internalWidgets[name] = Comagic.UI.createWidget(name, {
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
                                if (me.name === 'consultant_invite' && !me.is_consultant_invite_inited) {
                                    updateConsultantInviteStyle();
                                }
                                if (widgetsFullSize.indexOf(me.name) !== -1) {
                                    Comagic.UI.Mobile.form();
                                }
                            }, 0);
                        }
                    },
                    hide: function (isApi) {
                        var me = this;
                        me.getEl().classList.remove(me.getHelperSelector() + '--shown');
                        me.getEl().classList.add(me.getHelperSelector() + '--hidden');
                        if (widgetsFullSize.indexOf(me.name) !== -1) {
                            Comagic.UI.Mobile.unform();
                        }
                    }
                });
            });

            return internalWidgets;
        },
        widgets = newWidgets('consultant_label', 'consultant_invite', 'consultant_chat', 'consultant_offline_message', 'consultant_chat_group_selector'),
        renderToBodyWidgets = ['consultant_chat', 'consultant_offline_message'],
        renderToConsultantLabelsPlaceWidgets = ['consultant_label', 'consultant_invite'],
        extremeMessageWidget = {
            consultant_invite: {
                last: null,
                first: null
            },
            consultant_chat: {
                last: null,
                first: null
            }
        },
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

    function isVisibleChat() {
        return settings.chat.is_visible && widgets['consultant_chat'].isChatAvailable();
    }

    function isVisibleOfflineMessage() {
        return settings.offline_message.is_visible && (!settings.chat.is_visible ? true : !widgets['consultant_chat'].isChatAvailable());
    }

    function isVisibleConsultantLabel() {
        return isVisibleChat() || isVisibleOfflineMessage();
    }

    function isVisibleSitephoneLabel() {
        var isVisible = false;
        if (Comagic.UI.getWidget('sitephone')) {
            var sitephoneSettings = Comagic.UI.getWidget('sitephone').settings;
            isVisible = sitephoneSettings.is_visible && (sitephoneSettings.is_schedule_active || sitephoneSettings.is_always_displayed);
        }
        return isVisible;
    }

    function isVisibleSitephoneLabelWithConsultantLabel() {
        var isVisible = false;
        if (Comagic.UI.getWidget('sitephone')) {
            var sitephoneSettings = Comagic.UI.getWidget('sitephone').settings;
            isVisible = sitephoneSettings.is_visible &&
                sitephoneSettings.v_position === labelPosition.top &&
                sitephoneSettings.h_position === labelPosition.left &&
                (sitephoneSettings.is_schedule_active || sitephoneSettings.is_always_displayed);
        }
        return isVisible;
    }

    function rulesReducer(action) {
        return {
            consultant_label: (function () {
                switch (action) {
                    case 'consultant_invite':
                    case 'rack':
                        return isVisibleConsultantLabel();
                    default:
                        return false;
                }
            })(),
            consultant_chat_label_icon: isVisibleChat(),
            rack: true,
            consultant_invite: (function () {
                var isVisibleInvite = settings.chat.is_visible
                    && !widgets['consultant_chat'].isVisible()
                    && widgets['consultant_chat'].getState() === 'invite';
                switch (action) {
                    case 'rack':
                    case 'consultant_invite':
                        return isVisibleInvite;
                    default:
                        return false
                }
            })(),
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
                    case 'consultant_invite':
                        return widgets['consultant_chat'].isVisible();
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
                        if (['consultant_chat', 'consultant_chat_group_selector'].indexOf(wName) !== -1 || !Comagic.UI.Mobile.isFullSizeMode()) {
                            !widgets[wName].isVisible() && widgets[wName].show();
                        }
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

    function setHeaderTitleText(text) {
        widgets['consultant_chat'].refs['headerTitle'].innerHTML = text;
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
            }, config.delayAfterSubmit || 3000);
        }
    }

    function getAddMessageFn(config) {
        var isHistoryMode = config.isHistoryMode,
            _sender = config.sender,
            _name = config.name;

        return function (messageSettings, renderToWidget) {
            var currentMessageWidget,
                log = widgets[renderToWidget].refs['log'],
                prefix = messageSettings.fx_link ? '_file_' : '_',
                name;

            messageSettings.sender = _sender || messageSettings.sender;
            messageSettings.v_position = settings.chat.v_position;
            messageSettings.h_position = settings.chat.h_position;
            name = renderToWidget + '_' + messageSettings.sender + prefix + _name;

            currentMessageWidget = Comagic.UI.createWidget(name, {
                settings: messageSettings,
                tpl: tpls[name]
            });

            currentMessageWidget.render(log, isHistoryMode && log.firstChild);

            if (isHistoryMode) {
                if (extremeMessageWidget[renderToWidget]['last'] && extremeMessageWidget[renderToWidget]['last'].getEl() && extremeMessageWidget[renderToWidget]['last'].settings.sender === messageSettings.sender) {
                    currentMessageWidget.getEl().classList.remove('comagic-js-last-message');
                }
                extremeMessageWidget[renderToWidget]['last'] = currentMessageWidget;
            } else {
                if (extremeMessageWidget[renderToWidget]['first'] && extremeMessageWidget[renderToWidget]['first'].getEl() && extremeMessageWidget[renderToWidget]['first'].settings.sender === messageSettings.sender) {
                    extremeMessageWidget[renderToWidget]['first'].getEl().classList.remove('comagic-js-last-message');
                }
                extremeMessageWidget[renderToWidget]['first'] = currentMessageWidget;
            }

            setTimeout(function () {
                currentMessageWidget.getEl().classList.remove('comagic-js-consultant-message--hidden');
            }, 1);

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

    function hideConsultantInvite() {
        widgets['consultant_invite'].destroy();
        inviteMessageWidget.destroy();
    }

    function sendVisitorMessage() {
        var _creatorEl = widgets['consultant_chat'].refs['messageCreator'],
            _text = !!_creatorEl && _creatorEl.innerText.trim() || '';
        if (_text) {
            addMessage(widgets['consultant_chat'].sendChatMessage(_text, getCurrentGroupdId()), 'consultant_chat');
            if (widgets['consultant_chat'].getState() === 'invite') {
                widgets['consultant_chat'].inviteAccept();
                hideConsultantInvite();
            }
        }
        _creatorEl.innerHTML = '';
        toggleReadyForSend(false);
    }

    function checkVCardInfoAndSendVisitorMessage() {
        if (!!widgets['consultant_chat'].getRequiredInfo().length) {
            requestVCardInfoAndRun(sendVisitorMessage);
        } else {
            sendVisitorMessage()
        }
    }

    function messageAreaDisabled() {
        widgets['consultant_chat'].refs['messageEditor'].classList.add('comagic-js-messages-editor--disabled');
        widgets['consultant_chat'].refs['messageCreator'].setAttribute('contenteditable', false);
    }

    function messageAreaEnabled() {
        widgets['consultant_chat'].refs['messageEditor'].classList.remove('comagic-js-messages-editor--disabled');
        widgets['consultant_chat'].refs['messageCreator'].setAttribute('contenteditable', true);
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

    function requestVCardInfoAndRun(cb) {
        var messageWidget = addBotVCardMessage({chat: settings.chat, sender: 'bot'}, 'consultant_chat');
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

    widgets.do('render', null, renderToBodyWidgets);
    widgets.do('render', null, renderToConsultantLabelsPlaceWidgets);

    widgets.do('render', [widgets['consultant_chat'].refs['groupSelector']], ['consultant_chat_group_selector']);

    function updateLabelsVisibility() {
        if (isVisibleConsultantLabel() && !widgets['consultant_label'].isVisible()) {
            widgets['consultant_label'].show();
        }
        if (widgets['consultant_invite'].is_consultant_invite_inited && !widgets['consultant_invite'].isVisible()) {
            widgets['consultant_invite'].show();
        }
        if (isVisibleSitephoneLabel() && !Comagic.UI.getWidget('sitephone_label').isVisible()) {
            Comagic.UI.getWidget('sitephone_label').show();
        }
    }

    //offline message
    widgets['consultant_label'].refs['triggerOfflineMessage'].addEventListener('click', function () {
        visibilityObserver.pub('consultant_offline_message');
    });
    widgets['consultant_offline_message'].on('sendofflinerequest', afterSubmit({
        widgetName: 'consultant_offline_message',
        isClear: true,
        doAfterSubmit: function () {
            widgets['consultant_offline_message'].refs['submitBtn'].classList.remove('comagic-js-button--disabled');
            widgets['consultant_offline_message'].refs['closeBtn'].classList.remove('comagic-js-close-btn-hidden');
            visibilityObserver.pub('rack');
        }
    }));
    widgets['consultant_offline_message'].refs['closeBtn'].addEventListener('click', function () {
        visibilityObserver.pub('rack');
        updateLabelsVisibility();
    });
    widgets['consultant_offline_message'].refs['submitBtn'].addEventListener('click', function () {
        if (!widgets['consultant_offline_message'].getErrors()) {
            widgets['consultant_offline_message'].refs['submitBtn'].classList.add('comagic-js-button--disabled');
            widgets['consultant_offline_message'].refs['closeBtn'].classList.add('comagic-js-close-btn-hidden');
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
            setHeaderTitleText(settings.chat.group_title);
        });
        widgets['consultant_chat_group_selector'].on('hide', function () {
            setHeaderTitleText(settings.chat.title);
        })
    }
    widgets['consultant_label'].on('show', updateUnreadCounter);
    widgets['consultant_label'].refs['triggerChat'].addEventListener('click', function () {
        visibilityObserver.pub('consultant_chat');
    });
    widgets['consultant_chat'].refs['closeBtn'].addEventListener('click', function () {
        visibilityObserver.pub('rack');
        updateLabelsVisibility();
        if (widgets['consultant_chat'].getState() === 'invite') {
            widgets['consultant_chat'].inviteReject();
            hideConsultantInvite();
        }
    });

    widgets['consultant_chat'].on('messageviewed', updateUnreadCounter);
    widgets['consultant_chat'].on('show', function () {
        if (widgets['consultant_chat'].getState() !== 'available') {
            widgets['consultant_chat'].clearUnreadCounter();
        }
        if (hasLogScroll()) {
            setTimeout(function () {
                scrollLogBottom();
            }, 500);
        }
    });

    widgets['consultant_chat'].refs['ratingBtn'] && widgets['consultant_chat'].refs['ratingBtn'].addEventListener('click', function () {
        var messageW = addBotRatingMessage(widgets['consultant_chat'].getOperatorVcard() || {
                sender: 'bot'
            }, 'consultant_chat');

        messageW.refs['thumbsUpBtn'].addEventListener('click', function () {
            widgets['consultant_chat'].setOperatorRating(5);
            messageW.refs['content'].classList.add('comagic-js-show-feedback');
        });

        messageW.refs['thumbsDownBtn'].addEventListener('click', function () {
            widgets['consultant_chat'].setOperatorRating(1);
            messageW.refs['content'].classList.add('comagic-js-show-feedback');
        });

        toggleRatingBtn(true);
    });

    function toggleRatingBtn(isHidden) {
        widgets['consultant_chat'].refs['ratingBtn'].classList[isHidden ? 'add' : 'remove']('comagic-js-rating-btn-hidden');
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
        widgets['consultant_chat'].sendFile(this);
    });

    widgets['consultant_chat'].on('ratingchange', function (mark) {
        toggleRatingBtn(!!mark);
    });
    widgets['consultant_chat'].on('chatavailabilitychange', function () {
        if (!widgets['consultant_chat'].isVisible() && !widgets['consultant_offline_message'].isVisible()) {
            visibilityObserver.pub('rack');
        }
    });

    widgets['consultant_chat'].on('showchatretentionaction', function (messages) {
        var messageW = addBotRetentionBtnMessage(Comagic.UI.C.RETENTION_BUTTONS_SETTINGS[messages.alternate_communication_way], 'consultant_chat');
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
            addMessage(message, 'consultant_chat');
        }
    });

    widgets['consultant_chat'].on('sendmessage', function (message) {
        if (message.sender === 'operator') {
            widgets['consultant_chat'].refs['typingIndicator'].classList.remove('comagic-js-is-typing');
        }
        addMessage(message, 'consultant_chat');
        updateUnreadCounter();
    });

    widgets['consultant_chat'].refs['log'].addEventListener('scroll', function (e) {
        var logEl = widgets['consultant_chat'].refs['log'], history, i, prevScroll;
        if (logEl.scrollTop === 0) {
            history = widgets['consultant_chat'].getHistory();
            prevScroll = logEl.scrollHeight;
            if (history) {
                for (i = 0; i < history.length; i++) {
                    addHistoryMessage(history[i], 'consultant_chat');
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
                visibilityObserver.pub('consultant_chat');
                break;
            case 'invite':
                visibilityObserver.pub('consultant_invite');
                break;
        }
    });

    widgets['consultant_chat'].on('invite', function (message) {
        if (settings.chat.is_visible) {
            addMessage(message, 'consultant_chat');
            if (message.sender === 'operator') {
                if (!widgets['consultant_chat'].isVisible()) {
                    visibilityObserver.pub('consultant_invite');
                    widgets['consultant_invite'].is_consultant_invite_inited = true;
                    Comagic.UI.getWidget('consultant_invite_operator_message') && Comagic.UI.getWidget('consultant_invite_operator_message').destroy();
                    inviteMessageWidget = addMessage(message, 'consultant_invite');
                    inviteMessageWidget.on('beforeshow', function () {
                        consultantInviteOperatorMessageState = 'consultant_invite_operator_message';
                        Comagic.UI.Mobile.updateLabelStyles(inviteMessageWidget.refs['closeBtn'],
                            {
                                width: closeBtnSize,
                                minWidth: closeBtnSize,
                                height: closeBtnSize,
                                top: -6.5,
                                borderRadius: closeBtnSize / 2
                            }, null, null, null
                        );
                        Comagic.UI.Mobile.updateLabelStyles(inviteMessageWidget.getEl(), {borderRadius: 2}, null, null, null);
                        Comagic.UI.Mobile.updateLabelStyles(inviteMessageWidget.getEl('.comagic-c-invite-bubble__avatar'),
                            {
                                width: 13,
                                height: 13,
                                padding: 2
                            }, null, null, null
                        );
                        Comagic.UI.Mobile.updateLabelStyles(inviteMessageWidget.getEl('.comagic-c-invite-bubble__text'), {
                                width: 55,
                                paddingTop: 1,
                                paddingRight: 1
                            }, null, null, null
                        );

                        var triangleProperties = {
                            borderWidth: 3
                        };
                        labelPosition.top === 'top' ? triangleProperties.top = 5 : triangleProperties.bottom = 5;
                        labelPosition.left === 'left' ? triangleProperties.left = -5 : triangleProperties.right = -5;
                        Comagic.UI.Mobile.updateLabelStyles(inviteMessageWidget.getEl('.comagic-c-invite-bubble__triangle'), triangleProperties, null, null, null);
                        updateConsultantInviteStyle();
                    });
                    updateLabelsVisibility();
                    inviteMessageWidget.show();
                    inviteMessageWidget.refs['acceptBtn'].addEventListener('click', function () {
                        visibilityObserver.pub('consultant_chat');
                        widgets['consultant_chat'].inviteAccept();
                        hideConsultantInvite();
                    });
                    inviteMessageWidget.refs['closeBtn'].addEventListener('click', function () {
                        widgets['consultant_chat'].inviteReject();
                        hideConsultantInvite();
                    });
                }
            }
        }
    });

    widgets['consultant_label'].on('beforeshow', function () {
        consultantLabelState = 'consultant_label';
        Comagic.UI.Mobile.updateLabelStyles(
            widgets['consultant_label'].getEl(),
            {
                width: labelsSize,
                height: labelsSize,
                fontSize: fontSize
            }, null,
            labelPosition,
            {
                top: isVisibleSitephoneLabelWithConsultantLabel() ? (spaceBetweenLabels + defaultMarginTop - middlePositionMargin) : (labelPosition.top === 'middle') ? 0 : defaultMarginTop,
                left: defaultMarginLeft
            }
        );
        Comagic.UI.Mobile.updateLabelStyles(widgets['consultant_label'].refs['counter'], counterStyle, null, null, null);
    });
    function updateConsultantInviteStyle() {
        if (widgets['consultant_invite'] && widgets['consultant_invite'].getEl()) {
            Comagic.UI.Mobile.updateLabelStyles(widgets['consultant_invite'].getEl(), consultantInviteStyle, null, null, null);
            widgets['consultant_invite'].refs['log'].style['height'] = '';
            widgets['consultant_invite'].refs['log'].style['height'] = widgets['consultant_invite'].getEl().offsetHeight + 'px';

            Comagic.UI.Mobile.updateLabelStyles(widgets['consultant_invite'].getEl(), null, null,
                {
                    top: (labelPosition.top === 'middle') ? 'middle-fixed' : labelPosition.top,
                    left: labelPosition.left
                },
                {
                    top: isVisibleSitephoneLabelWithConsultantLabel() ? (spaceBetweenLabels + defaultMarginTop - inviteMiddlePositionMargin) : (labelPosition.top === 'middle') ? -defaultMarginTop : defaultMarginTop,
                    left: defaultMarginLeft + labelsSize + 5
                }
            );
        }
    }

    widgets['consultant_invite'].is_consultant_invite_inited = false;
    widgets['consultant_invite'].on('beforeshow', function () {
        if (!widgets['consultant_invite'].is_consultant_invite_inited) {
            widgets['consultant_invite'].getEl().classList.add('comagic-js-consultant-invite--hidden');
        }
        consultantInviteState = 'consultant_invite';
        updateConsultantInviteStyle();
    });

    function checkScreenOrientation() {
        var classListAction = (Math.abs(window.orientation) === 90) ? 'add' : 'remove';
        for (var i = 0; i < widgetsFullSize.length; i++) {
            var widgetName = widgetsFullSize[i];
            widgets[widgetName].getEl('.comagic-c-consultant-container__content').classList[classListAction]('comagic-js-consultant-container--hidden');
            widgets[widgetName].getEl('.comagic-c-consultant-container__landscape').classList[classListAction]('comagic-js-consultant-container--shown');
        }
    }

    function isActiveElementBelongsToWidget(element) {
        var widgetClasses = ['comagic-c-field', 'comagic-c-messages-editor__creator', 'comagic-c-select--select'],
            isActiveElementBelongsToWidget = false;
        for (var i = 0; i < widgetClasses.length; i++) {
            if (element.classList.contains(widgetClasses[i])) {
                isActiveElementBelongsToWidget = true;
                break;
            }
        }
        return isActiveElementBelongsToWidget;
    }

    checkScreenOrientation();
    window.addEventListener('orientationchange', function () {
        checkScreenOrientation();
        if (document.activeElement && isActiveElementBelongsToWidget(document.activeElement)) {
            document.activeElement.blur();
        }
    });

    Comagic.on('ui:actionstart', function () {
        inAction = true;
        if (consultantLabelState === 'consultant_label') {
            widgets['consultant_label'].hide();
        }
        if (consultantInviteState === 'consultant_invite') {
            widgets['consultant_invite'].hide();
        }
        if (consultantInviteOperatorMessageState === 'consultant_invite_operator_message') {
            inviteMessageWidget.hide();
        }
    });

    Comagic.on('ui:actionend', function () {
        inAction = false;
        if (!Comagic.UI.Mobile.isFullSizeMode() && !isSleep) {
            if (consultantLabelState === 'consultant_label') {
                widgets['consultant_label'].show();
            }
            if (consultantInviteState === 'consultant_invite') {
                widgets['consultant_invite'].show();
            }
            if (consultantInviteOperatorMessageState === 'consultant_invite_operator_message') {
                inviteMessageWidget.show();
            }
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
        isSleep = true;
    })
});
