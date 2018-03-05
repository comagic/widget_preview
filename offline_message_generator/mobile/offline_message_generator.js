Comagic.UI.registerViewController('offline_message_generator', function (settings, tpls) {
    if (!settings.fields) {
        return;
    }

    var offlineMessageGenerator = Comagic.UI.createWidget('offline_message_generator', {
        settings: settings,
        template: tpls['offline_message_generator'],
        id: settings['id'],

        _closeButtonEl: null,
        _mainButtonEl: null,
        _contentEl: null,
        _fieldsWrapperEl: null,
        _fieldWrapperEl: null,

        _setFieldError: function (field, error) {
            field.classList.toggle('comagic-error--hidden', !error);
            if (field.classList.contains('comagic-combobox-field')) field.querySelector('.comagic-lead__field__input').classList.toggle('comagic-lead__field__input--select', !error);
            field.value = error || null;
        },
        _isValid: function () {
            var errors = offlineMessageGenerator.getErrors() || {},
                _isValid = true;
            offlineMessageGenerator._fieldWrapperEl && offlineMessageGenerator._fieldWrapperEl.forEach(function (field) {
                var input = field.querySelector('input') || field.querySelector('textarea'),
                    error = errors[input.getAttribute('c-name')];
                if (error) {
                    _isValid = false;
                    offlineMessageGenerator._setFieldError(field, true);
                }
            });
            return _isValid;
        },
        _init: function () {
            var comboValue;

            offlineMessageGenerator._closeButtonEl = offlineMessageGenerator.getEl('.comagic-lead__button-close');
            offlineMessageGenerator._mainButtonEl = offlineMessageGenerator.getEl('.comagic-lead__main-button');
            offlineMessageGenerator._contentEl = offlineMessageGenerator.getEl('.comagic-lead__content');
            offlineMessageGenerator._fieldsWrapperEl = offlineMessageGenerator.getEl('.comagic-lead__fields-wrapper');
            offlineMessageGenerator._fieldWrapperEl = [].slice.apply(offlineMessageGenerator.getEl().getElementsByClassName('comagic-lead__field-wrapper'));

            offlineMessageGenerator._closeButtonEl && offlineMessageGenerator._closeButtonEl.addEventListener('click', function () {
                if (!offlineMessageGenerator.isSubmitted()) {
                    offlineMessageGenerator.cancel();
                }
                offlineMessageGenerator.hide();
                Comagic.UI.Mobile.unform();
            });

            offlineMessageGenerator._fieldWrapperEl && offlineMessageGenerator._fieldWrapperEl.forEach(function (field) {
                var input = field.querySelector('input') || field.querySelector('textarea');
                if (field.classList.contains('comagic-combobox-field')) {
                    var select = field.querySelector('select');
                    offlineMessageGenerator._initSelectOption(select);
                    select.value = null;
                    select.addEventListener('change', function () {
                        offlineMessageGenerator._removeEmptyOption(select);
                        var selectedValue = select.value,
                            selectedNode = [].slice.apply(select.children || []).filter(function (node) {
                                return node.value == selectedValue;
                            })[0];
                        input.value = selectedNode && selectedNode.text;
                        if (!isNaN(parseFloat(selectedValue)) && isFinite(selectedValue)) {
                            selectedValue = +selectedValue;
                        }
                        offlineMessageGenerator._setFieldError(field, false);
                        comboValue = selectedValue;
                    });
                } else {
                    input.addEventListener('focus', function () {
                        offlineMessageGenerator._setFieldError(field, false);
                        setTimeout(function () {
                            offlineMessageGenerator._contentEl.scrollTop = input.parentElement.parentElement.offsetTop;
                        }, 500);
                    })
                }
            });
            offlineMessageGenerator._mainButtonEl && offlineMessageGenerator._mainButtonEl.addEventListener('click', function () {
                if (offlineMessageGenerator._fieldsWrapperEl.classList.contains('comagic-lead__invite-step')) {
                    offlineMessageGenerator._mainButtonEl.querySelector('span').innerHTML = 'Отправить';
                    offlineMessageGenerator._fieldsWrapperEl.classList.remove('comagic-lead__invite-step');
                    offlineMessageGenerator.getEl('.comagic-lead__content').classList.add('comagic-full-screen-mode');
                    offlineMessageGenerator.getEl('.comagic-lead__mask').classList.add('comagic-full-screen-mode');
                } else {
                    if (offlineMessageGenerator._isValid()) {
                        var values = offlineMessageGenerator.getValues();
                        if (comboValue) values.group_id = comboValue;
                        offlineMessageGenerator.submit(values);
                        offlineMessageGenerator.hide();
                        Comagic.UI.Mobile.unform();
                    }
                }
            });
        },

        _initSelectOption: function (selectEl) {
            if (this.getEl().classList.contains('comagic-iphone')) {
                this._addEmptyOption(selectEl);
            }
        },
        _addEmptyOption: function (selectEl) {
            var emptyOption = document.createElement('option');
            emptyOption.setAttribute('value', null);
            selectEl.insertBefore(emptyOption, selectEl.firstChild);
        },
        _getEmptyOption: function (selectEl) {
            return selectEl.querySelector('option[value="null"]');
        },
        _removeEmptyOption: function (selectEl) {
            var emptyOption = this._getEmptyOption(selectEl);
            if (emptyOption) {
                emptyOption.remove();
            }
        }
    });
    offlineMessageGenerator.render();
    offlineMessageGenerator._init();
    offlineMessageGenerator.show();
    Comagic.UI.Mobile.form();
    offlineMessageGenerator.on('leadhide', function () {
        offlineMessageGenerator.hide();
        Comagic.UI.Mobile.unform();
    });
});
