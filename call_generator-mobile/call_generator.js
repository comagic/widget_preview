Comagic.UI.registerViewController('call_generator', function (settings, tpls) {
    var callGenerator = Comagic.UI.createWidget('call_generator', {
        settings: settings,
        id: settings['id'],
        template: tpls['call_generator'],
        _fields: {},
        _delayedCallProps: {},
        _delayedCallBlockState: null,
        _setFieldError: function (field, error) {
            field.classList.toggle('comagic-error--hidden', !error);
            if (field.classList.contains('comagic-combobox-field')) field.querySelector('.comagic-lead__field__input').classList.toggle('comagic-lead__field__input--select', !error);
            field.value = error || null;
        },
        _isValid: function () {
            var errors = callGenerator.getErrors() || {},
                _isValid = true;
            callGenerator._fieldWrapperEl && callGenerator._fieldWrapperEl.forEach(function (field) {
                var input = field.querySelector('input') || field.querySelector('textarea'),
                    error = errors[input.getAttribute('c-name')];
                if (error) {
                    _isValid = false;
                    callGenerator._setFieldError(field, true);
                }
            });
            return _isValid;
        },
        _init: function () {
            var comboValue;

            callGenerator._closeButtonEl = callGenerator.getEl('.comagic-lead__button-close');
            callGenerator._mainButtonEl = callGenerator.getEl('.comagic-lead__main-button');
            callGenerator._contentEl = callGenerator.getEl('.comagic-lead__content');
            callGenerator._fieldWrapperEl = [].slice.apply(callGenerator.getEl().getElementsByClassName('comagic-lead__field-wrapper'));

            callGenerator.getEl('.comagic-lead__button-close').addEventListener('click', function () {
                if (!callGenerator.isSubmitted()) {
                    callGenerator.cancel();
                }
                callGenerator.hide();
                Comagic.UI.Mobile.unform();
            });

            callGenerator._fieldWrapperEl && callGenerator._fieldWrapperEl.forEach(function (field) {
                var input = field.querySelector('input') || field.querySelector('textarea');
                if (field.classList.contains('comagic-combobox-field--group')) {
                    var select = field.querySelector('select');
                    callGenerator._initSelectOption(select);
                    select.value = null;
                    select.addEventListener('change', function () {
                        callGenerator._removeEmptyOption(select);
                        var selectedValue = select.value,
                            selectedNode = [].slice.apply(select.children || []).filter(function (node) {
                                return node.value == selectedValue;
                            })[0];
                        input.value = selectedNode && selectedNode.text;
                        if (!isNaN(parseFloat(selectedValue)) && isFinite(selectedValue)) {
                            selectedValue = +selectedValue;
                        }
                        callGenerator._setFieldError(field, false);
                        comboValue = selectedValue;
                    });
                } else {
                    input.addEventListener('focus', function () {
                        callGenerator._setFieldError(field, false);
                        setTimeout(function () {
                            callGenerator._contentEl.scrollTop = input.parentElement.parentElement.offsetTop;
                        }, 500);
                    })
                }
            });

            callGenerator._mainButtonEl && callGenerator._mainButtonEl.addEventListener('click', function () {
                if (callGenerator._isValid()) {
                    var values = callGenerator.getValues();
                    if (comboValue) values.group_id = comboValue;
                    callGenerator.submit(values);
                    callGenerator.hide();
                    Comagic.UI.Mobile.unform();
                }
            });

            callGenerator._initDelayedCallBlock();
        },

        _initSelectOption: function (selectEl) {
            if (this.getEl().classList.contains('comagic-iphone')) {
                this._addEmptyOption(selectEl);
            }
        },
        _addEmptyOption: function (selectEl) {
            var emptyOption = document.createElement('option');
            emptyOption.setAttribute('value', '');
            selectEl.insertBefore(emptyOption, selectEl.firstChild);
        },
        _getEmptyOption: function (selectEl) {
            return selectEl.querySelector('option[value=""]');
        },
        _removeEmptyOption: function (selectEl) {
            var emptyOption = this._getEmptyOption(selectEl);
            if (emptyOption) {
                emptyOption.remove();
            }
        },

        _initDelayedCallBlock: function () {
            if (!callGenerator.settings.delayed_call_times) {
                return;
            }

            callGenerator.delayedCallBlockEl = callGenerator.getEl('.comagic-call-generator__block-delayed-call');
            callGenerator.delayedCallBlockButton = callGenerator.getEl('.comagic-call-generator__linkbutton-delayed-call');

            callGenerator._fields['delayed_call_day'] = callGenerator.getEl('.comagic-call-generator__field-delayed-call-day');
            callGenerator._delayedCallProps.dayFakeSelectField = callGenerator.getEl('.comagic-call-generator__field-delayed-call-day__input');
            callGenerator._delayedCallProps.daySelectField = callGenerator.getEl('.comagic-call-generator__field-delayed-call-day__select');

            callGenerator._fields['delayed_call_time'] = callGenerator.getEl('.comagic-call-generator__field-delayed-call-time');
            callGenerator._delayedCallProps.timeFakeSelectField = callGenerator.getEl('.comagic-call-generator__field-delayed-call-time__input');
            callGenerator._delayedCallProps.timeSelectField = callGenerator.getEl('.comagic-call-generator__field-delayed-call-time__select');

            if (callGenerator.delayedCallBlockButton) {
                callGenerator._setDelayedCallBlockState(false);
                callGenerator.delayedCallBlockButton.addEventListener('click', function () {
                    callGenerator._setDelayedCallBlockState(!callGenerator._delayedCallBlockState);
                });
            }

            callGenerator._delayedCallProps.daySelectField.addEventListener('change', function () {
                callGenerator._removeEmptyOption(callGenerator._delayedCallProps.daySelectField);
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
                    callGenerator._initSelectOption(callGenerator._delayedCallProps.timeSelectField);
                    callGenerator._delayedCallProps.timeSelectField.value = null;
                    callGenerator._delayedCallProps.timeFakeSelectField.value = '';
                    callGenerator._setFieldError(callGenerator._fields['delayed_call_time'], false);
                }
                callGenerator._setFieldError(callGenerator._fields['delayed_call_day'], false);
            });

            callGenerator._delayedCallProps.timeSelectField.addEventListener('change', function () {
                callGenerator._removeEmptyOption(callGenerator._delayedCallProps.timeSelectField);
                var index = callGenerator._delayedCallProps.timeSelectField.selectedIndex,
                    selectedOption = callGenerator._delayedCallProps.timeSelectField.options[index];
                if (selectedOption) {
                    callGenerator._delayedCallProps.timeFakeSelectField.value = selectedOption.text;
                }
                callGenerator._setFieldError(callGenerator._fields['delayed_call_time'], false);
            });

            var options = '';
            for (var i = 0; i < callGenerator.settings.delayed_call_times.length; i++) {
                options += '<option>' + Comagic.UI.toDateString(new Date(callGenerator.settings.delayed_call_times[i].date)) + '</option>';
            }
            callGenerator._delayedCallProps.daySelectField.innerHTML = options;
            callGenerator._initSelectOption(callGenerator._delayedCallProps.daySelectField);
            callGenerator._delayedCallProps.daySelectField.value = null;
        },

        _setDelayedCallBlockState: function (enabled) {
            callGenerator._delayedCallBlockState = enabled;
            callGenerator.delayedCallBlockButton.innerText = enabled ? 'Звонок сейчас' : 'Выбрать другое время';
            callGenerator.delayedCallBlockEl.style.display = enabled ? 'flex' : 'none';
            callGenerator._delayedCallProps.timeFakeSelectField[enabled ? 'removeAttribute' : 'setAttribute']('c-disabled', '');
            callGenerator._delayedCallProps.timeSelectField.value = null;
            callGenerator._delayedCallProps.timeSelectField.innerHTML = '';
            callGenerator._delayedCallProps.timeFakeSelectField.value = '';
            callGenerator._delayedCallProps.daySelectField.value = null;
            callGenerator._delayedCallProps.dayFakeSelectField.value = '';
            callGenerator._delayedCallProps.dayFakeSelectField[enabled ? 'removeAttribute' : 'setAttribute']('c-disabled', '');
        }
    });
    callGenerator.render();
    callGenerator._init();
    callGenerator.show();
    Comagic.UI.Mobile.form();
    callGenerator.on('leadhide', function () {
        callGenerator.hide();
        Comagic.UI.Mobile.unform();
    });
});
