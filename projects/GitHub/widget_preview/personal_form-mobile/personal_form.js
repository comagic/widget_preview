Comagic.UI.registerViewController('personal_form', function (settings, tpls) {
    var personalForm = Comagic.UI.createWidget('personal_form', {
        settings: settings,
        id: settings['id'],
        template: tpls['personal_form'],

        mainButtonEl: null,
        closeButtonEl: null,

        _init: function () {
            personalForm.mainButtonEl = personalForm.getEl('.comagic-lead__main-button');
            personalForm.closeButtonEl = personalForm.getEl('.comagic-lead__button-close');

            personalForm.closeButtonEl && personalForm.closeButtonEl.addEventListener('click', function () {
                if (!personalForm.isSubmitted()) {
                    personalForm.cancel();
                }
                personalForm.hide();
                Comagic.UI.Mobile.unform();
            });

            personalForm.mainButtonEl && personalForm.mainButtonEl.addEventListener('click', function () {
                personalForm.submit();
                window.open(settings['button_url']);
            });
        }
    });
    personalForm.render();
    personalForm._init();
    personalForm.show();
    Comagic.UI.Mobile.form();
    personalForm.on('leadhide', function () {
        personalForm.hide();
        Comagic.UI.Mobile.unform();
    });
});
