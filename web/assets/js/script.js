var isClipboardCopySupported = document.queryCommandSupported && document.queryCommandSupported('copy');

$(function () {

    var messages = {
        'ok': 'Ok',
        'yes': 'Yes',
        'no': 'No',
        'close': 'Close',
        'arcdps_title': '[Arcdps] Templates for copy/paste in game',
        'arcdps_copy_traits': 'Copy traits',
        'arcdps_copy_skills': 'Copy skills',
        'arcdps_copy_all': 'Copy all',
        'alert-ajax': "Loading of content failed for some reason, please retry or contact the administrator.",
        'action-delete-token': "Do you really want to delete the api key ?<br />It cannot be cancelled.",
        'action-replace-token': "Paste your api key:",
        'bad-token': 'The provided api key is not valid.',
        'restore-token': "An API key was found in your browser. Do you want to restore your cookies with it ?",
        'restore-tokens': "API keys were found in your browser.  Do you want to restore your cookies with them ?"
    };
    if (LANG == 'fr') {
        messages = {
            'ok': 'Ok',
            'yes': 'Oui',
            'no': 'Non',
            'close': 'Fermer',
            'arcdps_title': '[Arcdps] Templates pour copier-coller en jeu',
            'arcdps_copy_traits': 'Copier les traits',
            'arcdps_copy_skills': 'Copier les skills',
            'arcdps_copy_all': 'Copier tout',
            'alert-ajax': "Loading of content failed for some reason, please retry or contact the administrator.",
            'action-delete-token': "Etes-vous sûr(e) de vouloir supprimer la clé d'application ?<br />Cette action ne peut pas être annulée.",
            'action-replace-token': "Collez votre clé d'application :",
            'bad-token': "La clé d'application n'est pas valide.",
            'restore-token': "Une clé d'application a été retrouvé dans votre navigateur. Voulez-vous restorer vos cookies avec elle ?",
            'restore-tokens': "Des clés d'application ont été retrouvées dans votre navigateur. Voulez-vous restorer vos cookies avec elles ?"
        };
    }

    var cookieRetention = 90;

    function isValidToken(token) {
        token = String(token);
        if (token.match(/^\s*[A-F0-9-]{70,80}\s*$/)) {
            $('.alert.token-error').fadeOut(400);
            return true;
        }
        bootbox.alert(messages['bad-token']);
        return false;
    }

    function saveTokens(tokens) {
        if (typeof tokens !== 'string') {
            if (tokens.length > 20) {
                tokens = tokens.reverse().slice(0, 20).reverse();
            }
            tokens = tokens.join('|');
        }

        Cookies.set('accesstoken', tokens, {expires: cookieRetention});
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('accesstoken', tokens);
        }
    }

    /**
     * refresh cookie
     */
    (function (tokens) {
        if (tokens) {
            saveTokens(tokens);
        } else if (typeof localStorage !== 'undefined') {
            var data = localStorage.getItem('accesstoken');
            if (typeof data === 'string' && data.match(/^\s*([A-F0-9-]{70,80})(\|[A-F0-9-]{70,80})*\s*$/)) {
                var question = data.match(/\|/) ? messages['restore-tokens'] : messages['restore-token'];
                bootbox.confirm({
                    message: question,
                    buttons: {
                        confirm: {
                            label: messages['yes'],
                            className: 'btn-success'
                        },
                        cancel: {
                            label: messages['no'],
                            className: 'btn-danger'
                        }
                    },
                    callback: function (ok) {
                        if (ok) {
                            saveTokens(data);
                            window.location.reload();
                        } else {
                            localStorage.setItem('accesstoken', '');
                        }
                    }
                });
            }
        }
    })(Cookies.get('accesstoken'));

    /**
     * ajax load of page content
     */
    $('[data-content="ajax"]').on('loadContent', function () {
        var $this = $(this);
        var url = $this.data('src');
        if (url) {
            $.get(url)
                .done(function (html) {
                    $this.html(html);
                    $('#container').trigger('loadedContent');
                })
                .fail(function () {
                    $this.html('<div class="alert alert-danger" role="alert">' + messages['alert-ajax'] + '</div>');
                });
        }
    });

    /**
     * home / register token
     */
    $('#access-token-form button').click(function () {
        var token = String($('#access-token-form input[name=access_token]').val());
        if (isValidToken(token)) {
            $.post('/api/token-check', {token: token})
                .done(function (json) {
                    if (json && json.code) {
                        saveTokens(json.tokens);
                        window.location = './' + json.code + '/';
                    }
                    if (json && json.error) {
                        bootbox.alert(json.error);
                    }
                })
                .fail(function (json) {
                    if (json && json.error) {
                        bootbox.alert(json.error);
                    }
                });

        }
    });

    /**
     * page account / save settings
     */
    $(document).on('click', '.page-account .action-save-rights', function () {
        var $btn = $(this);
        if (!$btn.hasClass('disabled')) {
            var rights = [];
            $btn.addClass('disabled');
            $('.rights input[type=checkbox]').each(function () {
                if ($(this).is(':checked')) {
                    rights.push($(this).prop('value'));
                }
            });
            $.post('/api/save-rights', {code: CODE, rights: rights}).always(function (json) {
                $btn.removeClass('disabled');
                bootbox.alert(json.message);
            });
        }

    });

    /**
     * page account / delete token
     */
    $(document).on('click', '.page-account .action-delete-token', function () {
        bootbox.confirm(messages['action-delete-token'], function (result) {
            if (result) {
                $.post('/api/token-delete', {code: CODE}).always(function (json) {
                    if (json.ok) {
                        saveTokens(json.tokens);
                    }
                    if (LANG) {
                        window.location = '/' + LANG + '/';
                    } else {
                        window.location = '/';
                    }
                });
            }
        });
    });

    /**
     * page account / replace token
     */
    $(document).on('click', '.page-account .action-replace-token', function () {
        bootbox.prompt(messages['action-replace-token'], function (result) {
            if (result && isValidToken(result)) {
                $.post('/api/token-replace', {code: CODE, newtoken: result})
                    .done(function (json) {
                        if (json) {
                            if (json.ok) {
                                saveTokens(json.tokens);
                                window.location.reload();
                            }
                            if (json.error) {
                                bootbox.alert(json.error);
                            }
                        }
                    })
                    .fail(function (json) {
                        if (json && json.error) {
                            bootbox.alert(json.error);
                        }
                    });

            }
        });
    });

    /**
     * tabs
     */
    $(document).on('click', '.nav.nav-tabs a', function (e) {
        var tabname = $(this).data('tab');
        $(this).parents('.nav').find('.active').removeClass('active');
        $(this).parent().addClass('active');
        $('#container .tab').hide();
        $('#container .tab.' + tabname).data('tab', tabname).show();
        $('#container .tab.' + tabname).trigger('tab-activation');
        e.preventDefault();
    });

    /**
     * collapsible panels
     */
    $(document).on('click', '.panel-toggle', function () {
        var $panel = $(this);
        if ($panel.hasClass('collapsed')) {
            $panel.next('div').slideDown(500, function () {
                $panel.removeClass('collapsed').addClass('expanded');
            });
        } else {
            $panel.next('div').slideUp(300, function () {
                $panel.removeClass('expanded').addClass('collapsed');
            });
        }
    });

    /**
     * wvw
     */
    $(document).on('click', '.wvw_ability div', function () {
        $(this).parent().find('ul').toggle();
    });

    /**
     * Masteries
     */
    $(document).on('click', '.page-masteries .regions .region div.mastery-name', function () {
        var id = $(this).data('id');
        $('.page-masteries .mastery').hide();
        $('#' + id).show();
    });

    /**
     * Deltaconnected trait links
     */
    $(document).on('click', 'a.dctraitlink', function (e) {
        var tplskills = $(this).data('tplskills');
        var tpltraits = $(this).data('tpltraits');

        var getHtml = function (cls, btnText, value) {
            var disabled = isClipboardCopySupported ? '' : 'disabled="disabled"';
            var html = '<div class="row ' + cls + '" style="margin-bottom: .2em">';
            html += '<div class="col-xs-8">';
            html += '<input type="text" class="form-control" readonly="readonly" value="' + value + '">';
            html += '</div>';
            html += '<div class="col-xs-4">';
            html += '<button type="button" class="btn btn-default" ' + disabled + ' style="display: block; width: 100%">' + btnText + '</button>';
            html += '</div>';
            return html + '</div>';
        };

        var dialog = bootbox.dialog({
            title: messages.arcdps_title,
            buttons: {
                cancel: {
                    label: messages.close
                },
                copy_all: {
                    label: isClipboardCopySupported ? messages.arcdps_copy_all : messages.ok,
                    callback: function () {
                        copyToClipboard(
                            $(dialog).find('.tpltraits input').val() +
                            $(dialog).find('.tplskills input').val()
                        );
                    }
                }
            },
            message:
            getHtml('tpltraits', messages.arcdps_copy_traits, tpltraits) +
            getHtml('tplskills', messages.arcdps_copy_skills, tplskills) +
            '<div class="copy_all" style="display: none"></div>',
            onEscape: true,
            className: 'deltaconnected-dialog'
        }).on('shown.bs.modal', function (e) {
            if (isClipboardCopySupported) {
                $(dialog).find('.tpltraits .btn, .tplskills .btn').click(function () {
                    copyToClipboard(
                        $(this).parents('.row').find('input').val()
                    );
                });
            }
        });
        e.stopPropagation();
        return false;
    });

    /**
     * dynamically set menu guild icons
     */
    (function () {
        $('.menuicon').each(function () {
            var m = (this.className + '').match(/guild-icon-([a-z0-9-]+)/i);
            if (m && m.length > 1) {
                if (m[1] == 'nothing') {
                    $(this).css('background-image', 'url(/assets/images/nothing.svg)');
                } else {
                    $(this).css('background-image', 'url(/proxy/guild/' + m[1] + '.svg)');
                }
            }
        });
    })();

    /**
     * tooltips
     */
    (function () {
        var cachedHtml = {};
        var $gwitemdetail = $('#gwitemdetail');
        var $body = $('body');

        function forceTooltipMove(obj, e) {
            var ev = $.Event('mousemove');
            ev.pageX = e.pageX;
            ev.pageY = e.pageY;
            $(obj).trigger(ev);
        }

        $gwitemdetail.on('click', function (e) {
            e.stopPropagation();
        });

        var triggerMove = function ($el) {
            var offset = $el.offset();
            var event = $.Event("mousedown", {
                which: 1,
                pageX: offset.left,
                pageY: offset.top
            });
            $el.trigger(event);
        };

        $(document).on('click', 'body', function (e) {
            $gwitemdetail.data('locked', false);
            $gwitemdetail.removeClass('locked');
            $gwitemdetail.hide();
        });

        $(document).on('click', '.gwitemlink', function (e) {
            var locked = $gwitemdetail.data('locked');
            var url = '/' + LANG + '/' + $(this).data('url');
            $gwitemdetail.data('locked', false);
            $(this).trigger('mouseenter');
            forceTooltipMove(this, e);
            if (!locked || locked !== url) {
                $gwitemdetail.data('locked', url);
            } else {
                $gwitemdetail.data('locked', locked ? false : url);
            }
            if ($gwitemdetail.data('locked')) {
                $gwitemdetail.addClass('locked');
            } else {
                $gwitemdetail.removeClass('locked');
            }
            e.stopPropagation();
        });

        $(document).on('mousemove', '.gwitemlink', function (e) {
            if (!$gwitemdetail.data('locked')) {
                var margin = 5;
                var posX = e.pageX + margin;
                var posY = e.pageY + margin;
                var maxWidth = $body.innerWidth();
                var maxHeight = $body.innerHeight();
                var tooltipWidth = $gwitemdetail.width();
                var tooltipHeight = $gwitemdetail.height();
                var tooLarge = posX + tooltipWidth + 10 > maxWidth;
                var tooHigh = posY + tooltipHeight > maxHeight;
                if (tooLarge && tooHigh) {
                    posX = posX - tooltipWidth - margin;
                    posY = posY - tooltipHeight - margin;
                } else if (tooLarge) {
                    posX = maxWidth - tooltipWidth - 10;
                } else if (tooHigh) {
                    posY = maxHeight - tooltipHeight - 10;
                }
                $gwitemdetail.css({
                    left: posX + 'px',
                    top: posY + 'px'
                });
            }
        });

        $(document).on('mouseleave', '.gwitemlink', function () {
            if (!$gwitemdetail.data('locked')) {
                $gwitemdetail.hide();
            }
        });

        $(document).on('mouseenter', '.gwitemlink', function (e) {
            var self = this;
            if (!$gwitemdetail.data('locked')) {
                var url = '/' + LANG + '/tooltip/' + $(self).data('url');
                $gwitemdetail.data('url', url);
                if (typeof (cachedHtml[url]) == 'undefined') {
                    forceTooltipMove(self, e);
                    $gwitemdetail.removeClass('locked');
                    $gwitemdetail.data('locked', false).html('<div class="spinner-loader-white"></div>').show();
                    $.get(url)
                        .done(function (html) {
                            cachedHtml[url] = html;
                            if ($gwitemdetail.data('url') === url) {
                                $gwitemdetail.html(html);
                                triggerMove($(self));
                            }
                        })
                        .fail(function () {
                            $gwitemdetail.html('<div class="gwitemerror">Error</div>');
                            $gwitemdetail.trigger('checksize');
                        });
                } else {
                    $gwitemdetail.html(cachedHtml[url]).show();
                    triggerMove($(self));
                }
            }
        });

    })();

    /**
     * checks a the end of loaded content
     */
    $('#container').bind('loadedContent', function () {
        $('.slotbars .slots').each(function () {
            var sum = 0, max = 0;
            var $bars = $(this).find('.slot .goldbar');
            $bars.each(function () {
                var g = parseInt($(this).data('g'));
                if (g > max) max = g;
                sum += g;
            });
            if (max > 0) {
                $bars.each(function () {
                    var g = parseInt($(this).data('g'));
                    $(this).css('width', (Math.round(1000 * g / max) / 10) + '%');
                });
                $bars.css('display', 'block');
            }
        });
    });

    /**
     * refresh automatique
     */
    refresh.init();

    /**
     * load contenet
     */
    $('[data-content="ajax"]').trigger('loadContent');
});

/**
 *
 * @type {{init, pause, start, reset}}
 */
var refresh = (function () {
    var $elements = $('.timer-auto-refresh');

    return {
        init: function () {
            $elements.each(function () {
                var $this = $(this);
                var delay = parseInt($this.data('delay') || '300');
                var func = function () {
                    var time = $this.data('time');
                    $this.data('time', $this.data('run') ? time - 1 : time);
                    if (time >= 0) {
                        $this.text(time);
                        $this.data('func', window.setTimeout(func, 1000));
                    } else {
                        $this.data('func', null);
                        window.location.reload();
                    }
                };
                $this.data('time', delay);
                $this.data('run', 1);
                func();
            });
        },
        pause: function () {
            $elements.data('run', 0);
        },
        start: function () {
            $elements.data('run', 1);
        },
        reset: function () {
            $elements.each(function () {
                var $this = $(this);
                var delay = parseInt($this.data('delay') || '300');
                $this.data('time', delay);
                $this.data('run', 1);
            });
        }
    };
})();


/**
 * statistics / render pie chart
 */
function renderPieChart() {
    $('[data-chart="Pie"]').each(function () {
        var $chart = $(this);
        if ($chart.data('rendered')) {
            return;
        }
        $chart.data('rendered', true);
        $.getJSON($(this).data('source'), function (data) {
            $chart.highcharts({
                exporting: {
                    enabled: false
                },
                colors: $chart.data('color') ? $chart.data('color').split(',') : Highcharts.getOptions().colors,
                chart: {
                    plotBackgroundColor: null,
                    plotBorderWidth: null,
                    plotShadow: false,
                    type: 'pie'
                },
                credits: {
                    enabled: false
                },
                title: {
                    text: ''
                },
                tooltip: {
                    formatter: function () {
                        return '<b>' + this.point.name + '</b>: ' + Math.round(this.percentage, 1) + ' %';
                    }
                },
                plotOptions: {
                    pie: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        dataLabels: {
                            enabled: false,
                        },
                        showInLegend: true
                    }
                },
                series: [{
                    colorByPoint: true,
                    data: data
                }]
            });
        });
    });
}

/**
 * statistics / render percentile chart
 */
function renderPercentileChart() {
    $('[data-chart="Percentile"]:visible').each(function () {
        var $chart = $(this);
        if ($chart.data('rendered')) {
            return;
        }
        $chart.data('rendered', true);
        var unit = $chart.data('unit');
        var tooltip = $chart.data('tooltip') || '<b>{point}%</b> of players have <b>{val}</b> {unit}';
        var divisor = $chart.data('divisor') ? parseInt($chart.data('divisor')) : 1;
        $.getJSON($(this).data('source'), function (data) {
            var series = [{
                type: 'area',
                zIndex: 0,
                data: data[0]
            }];
            if (data.length > 1) {
                series.push({
                    type: 'line',
                    zIndex: 1,
                    data: data[1]
                });
            }
            $chart.highcharts({
                exporting: {
                    enabled: false
                },
                colors: $chart.data('color') ? $chart.data('color').split(',') : Highcharts.getOptions().colors,
                chart: {
                    height: 250
                },
                credits: {
                    enabled: false
                },
                title: {
                    text: ''
                },
                xAxis: {
                    allowDecimals: false,
                    labels: {
                        formatter: function () {
                            return this.value + '%';
                        }
                    }
                },
                yAxis: {
                    title: {
                        text: $chart.data('legend')
                    },
                    labels: {
                        formatter: function () {
                            var val = Math.floor(this.value / divisor);
                            return formatNumber(val);
                        }
                    }
                },
                tooltip: {
                    formatter: function () {
                        return tooltip
                            .replace('{point}', this.point.x)
                            .replace('{val}', formatNumber(Math.floor(this.point.y / divisor)))
                            .replace('{unit}', unit);
                    }
                },
                plotOptions: {
                    area: {
                        pointStart: 1,
                        marker: {
                            enabled: false,
                            symbol: 'circle',
                            radius: 2,
                            states: {
                                hover: {
                                    enabled: true
                                }
                            }
                        },
                        showInLegend: false
                    },
                    line: {
                        pointStart: 1,
                        marker: {
                            enabled: true,
                            fillColor: 'black',
                            lineWidth: 2,
                            lineColor: 'black'
                        },
                        showInLegend: false
                    },
                    series: {
                        connectNulls: true
                    }
                },
                series: series
            });
        });
    });
}

/**
 *
 * @param n
 * @returns string
 */
function formatNumber(n) {
    return String(n).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, function ($1) {
        return $1 + "."
    });
}

/**
 *
 */
function copyToClipboard($element) {
    if (!isClipboardCopySupported) return;

    var targetId = "hiddenClipboardCopyTextarea";
    var $target = $('#' + targetId);
    var text = '';

    if ($target.length === 0) {
        $target = $('<textarea style="position: absolute; left: -999px; top: 0" id="' + targetId + '"></textarea>');
    }

    if (typeof $element === 'string') {
        text = $element;
    } else if ($element.is('input') || $element.is('textarea')) {
        text = $element.val();
    } else {
        text = $element.text();
    }

    var $modalBody = $('.bootbox .modal-body');
    if ($modalBody.length) {
        $modalBody.append($target);
    }

    $target.val(text);
    $target.focus();
    $target.select();

    // copy the selection
    var succeed;
    try {
        succeed = document.execCommand('copy');
    } catch (e) {
        bootbox.alert('Oops, something went wrong and I was unable to copy to clipboard. Use your own Ctrl+C instead :(');
        succeed = false;
    }

    $target.val('');
    $target.appendTo('body');

    return succeed;
}