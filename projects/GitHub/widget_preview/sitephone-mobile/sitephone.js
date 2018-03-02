Comagic.UI.registerViewController('sitephone', function (settings, tpls) {
    var widgetsFullSize = ['sitephone'],
        isSleep = false,

        consultantSitephoneLabelState,

        labelsSize = 15,
        defaultMarginTop = 7,
        defaultMarginLeft = 7,
        inAction = null,
        labelPosition = {
            top: settings.v_position,
            left: settings.h_position
        },
        middlePositionMargin = labelPosition.top === 'middle' ? labelsSize/2 + defaultMarginTop : 0,

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
        widgets = newWidgets('sitephone_label', 'sitephone'),
        renderToBodyWidgets = ['sitephone'],
        visibilityObserver;

    function isVisibleChat() {
        var isVisible = false;
        if (Comagic.UI.getWidget('consultant_label')) {
            isVisible = Comagic.UI.getWidget('consultant_label').settings.chat.is_visible && Comagic.UI.getWidget('consultant_chat').isChatAvailable();
        }
        return isVisible;
    }
    function isVisibleOfflineMessage() {
        var isVisible = false;
        if (Comagic.UI.getWidget('consultant_label') && Comagic.UI.getWidget('consultant_chat')) {
            isVisible = Comagic.UI.getWidget('consultant_label').settings.offline_message.is_visible &&
                (!Comagic.UI.getWidget('consultant_label').settings.chat.is_visible ? true : !Comagic.UI.getWidget('consultant_chat').isChatAvailable());
        }
        return isVisible;
    }
    function isVisibleConsultantLabel() {
        return isVisibleChat() || isVisibleOfflineMessage();
    }
    function isVisibleSitephoneLabel() {
        return settings.is_visible && (settings.is_schedule_active || settings.is_always_displayed);
    }

    function rulesReducer(action) {
        return {
            sitephone_label: (function () {
                switch (action) {
                    case 'rack':
                        return isVisibleSitephoneLabel();
                    default:
                        return false
                }
            })(),
            rack: true,
            sitephone: action === 'sitephone'
        };
    }

    function updateVisibility(rules) {
        for (var wName in rules) {
            if (rules.hasOwnProperty(wName)) {
                if (widgets[wName]) {
                    if (rules[wName]) {
                        if (wName === 'sitephone' || !Comagic.UI.Mobile.isFullSizeMode()) {
                            !widgets[wName].isVisible() && widgets[wName].show();
                        }
                    } else {
                        widgets[wName].isVisible() && widgets[wName].hide();
                    }
                }
            }
        }
    }

    function updateCaptcha() {
        if (widgets['sitephone'].refs['captchaImg']
            && widgets['sitephone'].refs['captcha']
            && widgets['sitephone'].refs['captchaKey']) {
            Comagic.getCaptcha(function (data) {
                widgets['sitephone'].refs['captchaImg'].src = data.url;
                widgets['sitephone'].refs['captcha'].innerHTML = '';
                widgets['sitephone'].refs['captchaKey'].innerHTML = data.key;
            }, {'bg': '#' + settings.banner_color});
        }
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

    widgets.do('render', null, renderToBodyWidgets);
    widgets.do('render', null, ['sitephone_label']);

    function updateLabelsVisibility() {
        if (isVisibleConsultantLabel() && !Comagic.UI.getWidget('consultant_label').isVisible()) {
            Comagic.UI.getWidget('consultant_label').show();
        }
        if (Comagic.UI.getWidget('consultant_invite') && Comagic.UI.getWidget('consultant_invite').is_consultant_invite_inited && !Comagic.UI.getWidget('consultant_invite').isVisible()) {
            Comagic.UI.getWidget('consultant_invite').show();
        }
        if (isVisibleSitephoneLabel() && !widgets['sitephone_label'].isVisible()) {
            widgets['sitephone_label'].show();
        }
    }

    //sitephones
    widgets['sitephone_label'].refs['trigger'].addEventListener('click', function () {
        visibilityObserver.pub(widgets['sitephone'].name);
    });
    widgets['sitephone'].on('show', updateCaptcha);
    widgets['sitephone'].refs['closeBtn'].addEventListener('click', function () {
        visibilityObserver.pub('rack');
        updateLabelsVisibility();
    });
    widgets['sitephone'].refs['submitBtn'].addEventListener('click', function () {
        if (!widgets['sitephone'].getErrors()) {
            widgets['sitephone'].refs['submitBtn'].classList.add('comagic-js-button--disabled');
            widgets['sitephone'].refs['closeBtn'].classList.add('comagic-js-close-btn-hidden');
            widgets['sitephone'].startCall(widgets['sitephone'].getValues());
        }
    });
    widgets['sitephone'].refs['captchaUpdateBtn'] && widgets['sitephone'].refs['captchaUpdateBtn'].addEventListener('click', updateCaptcha);
    if (settings.delayed_call_times) {
        function setDelayedCallBlockState(enabled) {
            widgets['sitephone'].refs['date'][enabled ? 'removeAttribute' : 'setAttribute']('c-disabled', '');
            widgets['sitephone'].refs['delayedCallTime'][enabled ? 'removeAttribute' : 'setAttribute']('c-disabled', '');
        }

        function clearDelayedCallTime() {
            while (widgets['sitephone'].refs['delayedCallTime'].querySelector('option')) {
                widgets['sitephone'].refs['delayedCallTime'].removeChild(widgets['sitephone'].refs['delayedCallTime'].querySelector('option'));
            }
        }

        function setDelayedCallTimeDisable(isDisabled) {
            widgets['sitephone'].refs['delayedCallTime'].classList[isDisabled ? 'add' : 'remove']('comagic-js-select-disabled');
        }

        setDelayedCallBlockState(!widgets['sitephone'].getEl('.comagic-js-date-fields--is-active'));
        setDelayedCallTimeDisable(true);
        widgets['sitephone'].refs['dateChangeTrigger'].addEventListener('click', function () {
            setDelayedCallBlockState(true);
            widgets['sitephone'].refs['dateFields'].classList.add('comagic-js-date-fields--is-call-without-delay');
        });
        widgets['sitephone'].refs['dateNowTrigger'].addEventListener('click', function () {
            setDelayedCallBlockState(false);
            clearDelayedCallTime();
            setDelayedCallTimeDisable(true);
            widgets['sitephone'].refs['delayedCallTime'].value = null;
            widgets['sitephone'].refs['delayedCallTimeCustomSelect'].innerHTML = ''; //change event doesn`t work after change value from js code
            widgets['sitephone'].refs['date'].value = null;
            widgets['sitephone'].refs['dateCustomSelect'].innerHTML = '';
            widgets['sitephone'].refs['dateFields'].classList.remove('comagic-js-date-fields--is-call-without-delay');
        });
        widgets['sitephone'].refs['date'].addEventListener('change', function () {
            var selectedOption = widgets['sitephone'].refs['date'].options[widgets['sitephone'].refs['date'].selectedIndex],
                delayedCallTimeObj = settings.delayed_call_times[selectedOption.value];
            widgets['sitephone'].refs['delayedCallTime'].value = null;
            widgets['sitephone'].refs['delayedCallTime'].innerHTML = Comagic.UI.createEl(tpls['sitephone_times_options'], delayedCallTimeObj).innerHTML;
            setDelayedCallTimeDisable(false);
        });
    }

    widgets['sitephone'].on('callcomplete', afterSubmit({
        widgetName: 'sitephone',
        isClear: true,
        doAfterSubmit: function (answer) {
            if (widgets['sitephone'].isVisible()) {
                widgets['sitephone'].refs['submitBtn'].classList.remove('comagic-js-button--disabled');
                widgets['sitephone'].refs['closeBtn'].classList.remove('comagic-js-close-btn-hidden');
                updateCaptcha();
                if (answer.success) {
                    visibilityObserver.pub('rack');
                }
            }
        }
    }));

    widgets['sitephone_label'].on('beforeshow', function () {
        consultantSitephoneLabelState = 'sitephone_label';
        Comagic.UI.Mobile.updateLabelStyles(
            widgets['sitephone_label'].getEl(),
            {
                width: labelsSize,
                height: labelsSize
            }, null,
            labelPosition,
            {
                top: isVisibleConsultantLabel() ? defaultMarginTop - middlePositionMargin : (labelPosition.top === 'middle') ? 0 : defaultMarginTop,
                left: defaultMarginLeft
            }
        );
    });

    function checkScreenOrientation() {
        var classListAction = (Math.abs(window.orientation) === 90) ? 'add' : 'remove';
        for (var i = 0; i < widgetsFullSize.length; i++) {
            var widgetName = widgetsFullSize[i];
            widgets[widgetName].getEl('.comagic-c-sitephone-container__content').classList[classListAction]('comagic-js-sitephone-container--hidden');
            widgets[widgetName].getEl('.comagic-c-sitephone-container__landscape').classList[classListAction]('comagic-js-sitephone-container--shown');
        }
    }
    function isActiveElementBelongsToWidget(element) {
        var widgetClasses = ['comagic-c-field', 'comagic-c-select--select'],
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
        if (consultantSitephoneLabelState === 'sitephone_label') {
            widgets['sitephone_label'].hide();
        }
    });

    Comagic.on('ui:actionend', function () {
        inAction = false;
        if (!Comagic.UI.Mobile.isFullSizeMode() && !isSleep) {
            if (consultantSitephoneLabelState === 'sitephone_label') {
                widgets['sitephone_label'].show();
            }
        }
    });

    //set visibility props
    visibilityObserver = Comagic.UI.createObserver(rulesReducer);
    visibilityObserver.sub(updateVisibility);
    visibilityObserver.pub('hide_all');
    visibilityObserver.pub('rack');

    Comagic.on('sleep', function () {
        visibilityObserver.pub('hide_all');
        isSleep = true;
    })
});