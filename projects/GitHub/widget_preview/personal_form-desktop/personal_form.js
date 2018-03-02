Comagic.UI.registerViewController('personal_form', function (settings, tpls) {
    var personalForm = Comagic.UI.createWidget('personal_form', {
        settings: settings,
        id: settings['id'],
        template: tpls['personal_form'],

        render: function () {
            if (settings['is_image'] && !this.imgLoaded) {
                this._onImageLoad(settings['image_url'], this.render, this);
                return;
            }
            this.constructor.prototype.render.apply(this, arguments);
            this._setPosition();
            this.getEl('.comagic-personal-form__main-btn').addEventListener('click', function () {
                personalForm.submit();
                window.open(settings['button_url']);
                personalForm.destroy();
            });

            this.getEl('.comagic-personal-form__close-btn').addEventListener('click', function () {
                if (!personalForm.isSubmitted()) {
                    personalForm.cancel();
                }
                personalForm.destroy()
            });
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
                el = backgroundEl.querySelector('.comagic-personal-form');

            setTimeout(function () {
                el.classList.add('comagic-personal-form--showed');
            }, 10);

            this._centered = settings['h_position'] == 'center' && settings['v_position'] == 'middle';
        },

        destroy: function () {
            var scope = this,
                backgroundEl = this.getEl(),
                el = backgroundEl.querySelector('.comagic-personal-form');

            if (this._centered) {
                scope.constructor.prototype.destroy.apply(scope, arguments);
            } else {
                el.classList.remove('comagic-personal-form--showed');
                setTimeout(function () {
                    scope.constructor.prototype.destroy.apply(scope, arguments);
                }, 500);
            }
        }
    });
    personalForm.render();

    personalForm.on('leadhide', function () {
        personalForm.destroy();
    });

    personalForm.on('leadsubmit', function (answer) {
    });
});