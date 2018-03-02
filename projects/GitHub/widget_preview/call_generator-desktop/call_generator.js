Comagic.UI.registerViewController('call_generator', function (settings, tpls) {
    var callGenerator = Comagic.UI.createWidget('call_generator', {
        settings: settings,
        id: settings['id'],
        template: tpls['call_generator'],
        _errorFieldCls: 'comagic-call-generator__field--error',
        _errorInputFieldCls: 'comagic-call-generator__field--error__input',
        _fields: {},
        _delayedCallProps: {},
        _delayedCallBlockState: null,

        _getBodies: function () {
            return [].slice.apply(this.getEl().querySelectorAll('.comagic-call-generator__body'));
        },

        _switchMode: function (title, message) {
            var bb = this._getBodies(),
                handler = function () {
                    bb[0].removeEventListener('transitionend', handler);
                    bb[0].classList.add('comagic-call-generator-hidden');
                    bb[1].classList.remove('comagic-call-generator__body--transparent');
                };
            bb[0].addEventListener('transitionend', handler);
            bb[0].classList.add('comagic-call-generator__body--transparent');
            bb[1].classList.remove('comagic-call-generator-hidden');
            if (title && message) {
                bb[1].querySelector('.comagic-call-generator__body-reverse__title').innerHTML = title;
                bb[1].querySelector('.comagic-call-generator__message').innerHTML = message;
            }
        },

        render: function () {
            var scope = this,
                combo, comboInput, comboList, phone, phoneInput;

            this.constructor.prototype.render.apply(this, arguments);

            this.getEl('.comagic-call-generator__close-btn').addEventListener('click', function () {
                if (!scope.isSubmitted()) {
                    scope.cancel();
                }
                scope.destroy()
            });
            this.getEl('.comagic-call-generator__main-btn').addEventListener('click', function () {
                var values;
                if (scope._isValid()) {
                    values = scope.getValues();
                    delete values['group'];
                    combo && (values['group_id'] = comboInput.selectedValue);
                    scope.submit(values);
                }
            });

            combo = this.getEl('.comagic-call-generator__field-group-lead');

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

            this._iterFields(function (field, input) {
                var scope = this,
                    getClearFn = function (f, i) {
                        return function () {
                            scope._clearField(f, i);
                        }
                    };
                input.addEventListener('focus', getClearFn(field, input));
            }, this);

            this._initDelayedCallBlock();
        },

        _initDelayedCallBlock: function () {
            if (!this.settings.delayed_call_times) {
                return;
            }

            this.delayedCallBlockEl = this.getEl('.comagic-call-generator__block-delayed-call');
            this.delayedCallBlockButton = this.getEl('.comagic-call-generator__linkbutton-delayed-call');

            this._fields['delayed_call_day'] = this.getEl('.comagic-call-generator__field-delayed-call-day');
            this._delayedCallProps.dayFakeSelectField = this.getEl('.comagic-call-generator__field-delayed-call-day__input');
            this._delayedCallProps.daySelectField = this.getEl('.comagic-call-generator__field-delayed-call-day__select');

            this._fields['delayed_call_time'] = this.getEl('.comagic-call-generator__field-delayed-call-time');
            this._delayedCallProps.timeFakeSelectField = this.getEl('.comagic-call-generator__field-delayed-call-time__input');
            this._delayedCallProps.timeSelectField = this.getEl('.comagic-call-generator__field-delayed-call-time__select');

            if (this.delayedCallBlockButton) {
                this._setDelayedCallBlockState(false);
                this.delayedCallBlockButton.addEventListener('click', function () {
                    callGenerator._setDelayedCallBlockState(!callGenerator._delayedCallBlockState);
                });
            }

            this._delayedCallProps.daySelectField.addEventListener('change', function () {
                var index = callGenerator._delayedCallProps.daySelectField.selectedIndex,
                    selectedOption = callGenerator._delayedCallProps.daySelectField.options[index];
                if (selectedOption && selectedOption.text !== callGenerator._delayedCallProps.dayFakeSelectField.value) {
                    callGenerator._delayedCallProps.dayFakeSelectField.value = selectedOption.text;
                    var options = '';
                    for (var i = 0; i < callGenerator.settings.delayed_call_times[index].times.length; i++) {
                        options += '<option value=' + callGenerator.settings.delayed_call_times[index].times[i] + '>' +
                            Comagic.UI.toTimeString(new Date(callGenerator.settings.delayed_call_times[index].times[i])) + '</option>';
                    }
                    callGenerator._delayedCallProps.timeSelectField.innerHTML = options;
                    callGenerator._delayedCallProps.timeSelectField.value = null;
                    callGenerator._delayedCallProps.timeFakeSelectField.value = '';
                    callGenerator._clearField(callGenerator._fields['delayed_call_time'], callGenerator._delayedCallProps.timeFakeSelectField);
                }
                callGenerator._clearField(callGenerator._fields['delayed_call_day'], callGenerator._delayedCallProps.dayFakeSelectField);
            });

            this._delayedCallProps.timeSelectField.addEventListener('change', function () {
                var index = callGenerator._delayedCallProps.timeSelectField.selectedIndex,
                    selectedOption = callGenerator._delayedCallProps.timeSelectField.options[index];
                if (selectedOption) {
                    callGenerator._delayedCallProps.timeFakeSelectField.value = selectedOption.text;
                }
                callGenerator._clearField(callGenerator._fields['delayed_call_time'], callGenerator._delayedCallProps.timeFakeSelectField);
            });

            var options = '';
            for (var i = 0; i < this.settings.delayed_call_times.length; i++) {
                options += '<option>' + Comagic.UI.toDateString(new Date(callGenerator.settings.delayed_call_times[i].date)) + '</option>';
            }
            this._delayedCallProps.daySelectField.innerHTML = options;
            this._delayedCallProps.daySelectField.value = null;
        },

        _setDelayedCallBlockState: function (enabled) {
            this._delayedCallBlockState = enabled;
            this.delayedCallBlockButton.innerText = enabled ? 'Звонок сейчас' : 'Выбрать другое время';
            this.delayedCallBlockEl.style.display = enabled ? 'flex' : 'none';
            this._delayedCallProps.timeSelectField[enabled ? 'removeAttribute' : 'setAttribute']('c-disabled', '');
            this._delayedCallProps.timeSelectField.value = null;
            this._delayedCallProps.timeSelectField.innerHTML = '';
            this._delayedCallProps.timeFakeSelectField.value = '';
            this._delayedCallProps.daySelectField.value = null;
            this._delayedCallProps.dayFakeSelectField.value = '';
            this._delayedCallProps.daySelectField[enabled ? 'removeAttribute' : 'setAttribute']('c-disabled', '');
        },

        _iterFields: function (callback, scope) {
            [].slice.apply(this.getEl().querySelectorAll('.comagic-call-generator__field')).forEach(function (field) {
                callback.call(
                    scope || this,
                    field,
                    field && field.querySelector('.comagic-call-generator__field__input')
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

        _clearField: function (field, input) {
            field && this._clearEl(field, this._errorFieldCls);
            input && this._clearEl(input, this._errorInputFieldCls);
        },

        _clearEl: function (el, errorCls) {
            var errorClasses;

            errorClasses = [].slice.apply(el.classList).filter(function (cls) {
                return cls == errorCls || cls.indexOf(errorCls + '--') == 0;
            });
            errorClasses.forEach(function (cls) {
                el.classList.remove(cls);
            });
        }
    });

    callGenerator.render();
    callGenerator.on('leadhide', function () {
        callGenerator.destroy();
    });

    callGenerator.on('leadsubmit', function (response) {
        callGenerator._switchMode(response.info.title, response.info.message);
    });
});