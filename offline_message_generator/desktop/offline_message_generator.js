Comagic.UI.registerViewController('offline_message_generator', function (settings, tpls) {
    var offlineMessageGenerator = Comagic.UI.createWidget('offline_message_generator', {
        settings: settings,
        template: tpls['offline_message_generator'],
        id: settings['id'],
        _submittedCls: 'comagic-offline-message-generator--submitted',
        _errorFieldCls: 'comagic-offline-message-generator__field--error',
        _errorInputFieldCls: 'comagic-offline-message-generator__field--error__input',
        _DELAY_POPUP_ANIMATION: 3300,
        _DELAY_HIDING_ANIMATION: 300,

        render: function () {
            var scope = this,
                combo, comboInput, comboList;
            if (settings['is_image'] && !this.imgLoaded) {
                this._onImageLoad(settings['image_url'], this.render, this);
                return;
            }
            this.constructor.prototype.render.apply(this, arguments);
            this._setPosition();

            this.getEl('.comagic-offline-message-generator__close-btn').addEventListener('click', function () {
                if (!offlineMessageGenerator.isSubmitted()) {
                    offlineMessageGenerator.cancel();
                }
                offlineMessageGenerator.destroy()
            });

            this.getEl('.comagic-offline-message-generator__main-btn').addEventListener('click', function () {
                var values;
                if (!scope.isSubmitted() && scope._isValid()) {
                    values = scope.getValues();
                    delete values['group'];
                    combo && (values['group_id'] = comboInput.selectedValue);
                    scope.submit(values);
                }
            });

            this._iterFields(function (field, input) {
                var scope = this,
                    getClearFn = function (f, i) {
                        return function () {
                            scope._clearField(f, i);
                        }
                    };
                input.addEventListener('focus', getClearFn(field, input));
            }, this);

            combo = this.getEl('.comagic-offline-message-generator__field-group');

            if (combo) {
                comboInput = combo.querySelector('input');
                comboList = combo.querySelector('select');

                comboList.value = null;
                comboList.addEventListener('change', function () {
                    var selectedValue = comboList.value,
                        selectedNode = [].slice.apply(comboList.children).filter(function (node) {
                            return node.value == selectedValue;
                        })[0];
                    comboInput.value = selectedNode && selectedNode.text;
                    if (!isNaN(parseFloat(selectedValue)) && isFinite(selectedValue)) {
                        selectedValue = +selectedValue;
                    }
                    scope._clearField(combo, comboInput);
                    comboInput.selectedValue = selectedValue;
                });

                comboList.addEventListener('focus', function () {
                    scope._clearField(combo, comboInput);
                });
            }

            this._initPopup();
        },

        _initPopup: function () {
            this._popup = this.getEl('.comagic-offline-message-generator__submit-popup');
            this._popupSubmitInfoTitle = this.getEl('.comagic-offline-message-generator__submit-popup__title');
            this._popupSubmitInfoMessage = this.getEl('.comagic-offline-message-generator__submit-popup__message');
        },

        _showPopupSubmitInfo: function (o) {
            this._popupSubmitInfoTitle.innerHTML = o.info.title;
            this._popupSubmitInfoMessage.innerHTML = o.info.message;
            this._popup.classList.add(
                o.success
                    ? 'comagic-offline-message-generator__submit-popup--success'
                    : 'comagic-offline-message-generator__submit-popup--failure'
            );
            this._popup.classList.remove('comagic-offline-message-generator__submit-popup--hidden');
        },

        _onImageLoad: function (url, callback, scope) {
            var img = document.createElement('IMG'),
                handler = function () {
                    scope.imgLoaded = true;
                    callback.apply(scope);
                };

            img.addEventListener('load', handler);
            img.addEventListener('error', handler);
            img.src = url;
        },

        _setPosition: function () {
            var backgroundEl = this.getEl(),
                el = backgroundEl.querySelector('.comagic-offline-message-generator');

            setTimeout(function () {
                el.classList.add('comagic-offline-message-generator--shown');
            }, 10);

            this._centered = settings['v_position'] == 'center' && settings['h_position'] == 'middle';
        },

        _iterFields: function (callback, scope) {
            [].slice.apply(this.getEl().querySelectorAll('.comagic-offline-message-generator__field')).forEach(function (field) {
                callback.call(
                    scope || this,
                    field,
                    field && field.querySelector('.comagic-offline-message-generator__field__input')
                );
            });
        },

        _isValid: function () {
            var scope = this,
                errors = this.getErrors() || {},
                isValid = true;

            this._iterFields(function (field, input) {
                var error = errors[input.getAttribute('c-name')];

                if (error) {
                    isValid = false;
                    scope._setElError(field, scope._errorFieldCls, error);
                    scope._setElError(input, scope._errorInputFieldCls, error);
                }
            }, this);

            return isValid;
        },

        _setElError: function (el, errorCls, errorName) {
            el.classList.add(errorCls);
            el.classList.add(errorCls + '--' + errorName);
        },

        _clearField: function (field, inner) {
            field && this._clearEl(field, this._errorFieldCls);
            inner && this._clearEl(inner, this._errorInputFieldCls);
        },

        _clearEl: function (el, errorCls) {
            var errorClasses;

            errorClasses = [].slice.apply(el.classList).filter(function (cls) {
                return cls == errorCls || cls.indexOf(errorCls + '--') == 0;
            });
            errorClasses.forEach(function (cls) {
                el.classList.remove(cls);
            });
        },

        destroy: function () {
            var scope = this,
                backgroundEl = this.getEl(),
                el = backgroundEl.querySelector('.comagic-offline-message-generator'),
                delay = 0;

            if (this.isSubmitted()) {
                delay = this._DELAY_POPUP_ANIMATION;
            } else if (!this._centered) {
                delay = this._DELAY_HIDING_ANIMATION;
            }

            el.classList.remove('comagic-offline-message-generator--shown');
            setTimeout(function () {
                scope.constructor.prototype.destroy.apply(scope, arguments);
            }, delay);
        },

        submit: function () {
            this.getEl('.comagic-offline-message-generator').classList.add(this._submittedCls);
            this.constructor.prototype.submit.apply(this, arguments);
        }
    });

    offlineMessageGenerator.render();
    offlineMessageGenerator.on('leadhide', function () {
        offlineMessageGenerator.destroy();
    });

    offlineMessageGenerator.on('leadsubmit', function (request) {
        offlineMessageGenerator._showPopupSubmitInfo(request);
        offlineMessageGenerator.destroy();
    });

});
