/*
 * Copyright 2014-2015 Hewlett-Packard Development Company, L.P.
 * Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
 */

define([
    'js-whatever/js/base-page',
    'find/app/model/entity-collection',
    'find/app/model/documents-collection',
    'find/app/model/indexes-collection',
    'find/app/model/fields-model',
    'find/app/model/fieldvalues-model',
    'find/app/router',
    'find/app/vent',
    'i18n!find/nls/bundle',
    'text!find/templates/app/page/find-search.html',
    'text!find/templates/app/page/results-container.html',
    'text!find/templates/app/page/suggestions-container.html',
    'text!find/templates/app/page/loading-spinner.html',
    'text!find/templates/app/page/colorbox-controls.html',
    'text!find/templates/app/page/index-popover.html',
    'text!find/templates/app/page/index-popover-contents.html',
    'text!find/templates/app/page/top-results-popover-contents.html',
    'text!find/templates/app/page/parametric-container.html',
    'text!find/templates/app/page/parametric-value-container.html',
    'colorbox'
], function(BasePage, EntityCollection, DocumentsCollection, IndexesCollection, FieldsModel, FieldValuesModel, router, vent, i18n, template, resultsTemplate,
            suggestionsTemplate, loadingSpinnerTemplate, colorboxControlsTemplate, indexPopover, indexPopoverContents, topResultsPopoverContents, parametricContainer,
            paramValContainer) {

    return BasePage.extend({

        template: _.template(template),
        resultsTemplate: _.template(resultsTemplate),
        noResultsTemplate: _.template('<div class="no-results span10"><%- i18n["search.noResults"] %> </div>'),
        suggestionsTemplate: _.template(suggestionsTemplate),
        indexPopover: _.template(indexPopover),
        indexPopoverContents: _.template(indexPopoverContents),
        topResultsPopoverContents: _.template(topResultsPopoverContents),
        parametricContainer: _.template(parametricContainer),
        paramValContainer: _.template(paramValContainer),

        events: {
            'keyup .find-input': 'keyupAnimation',
            'click .list-indexes': _.debounce(function(){
                this.$('.popover-content label').html('');

                this.indexesCollection.fetch();
            }, 500, true),
            'change [name="indexRadios"]': function(e) {
                this.index = $(e.currentTarget).val();

                if(this.$('.find-input').val()){
                    this.searchRequest(this.$('.find-input').val());
                }
            },
            'mouseover .suggestions-content a': _.debounce(function(e) {
                this.$('.suggestions-content  .popover-content').append(_.template(loadingSpinnerTemplate));

                this.topResultsCollection.fetch({
                    data: {
                        text: $(e.currentTarget).html(),
                        max_results: 3,
                        summary: 'quick',
                        index: this.index
                    }
                });
            }, 800),
            'mouseover .entity-to-summary': function(e) {
                var title = $(e.currentTarget).find('a').html();
                this.$('[data-title="'+ title +'"]').addClass('label label-primary entity-to-summary').removeClass('label-info');
            },
            'mouseleave .entity-to-summary': function() {
                this.$('.suggestions-content li a').removeClass('label label-primary entity-to-summary');
                this.$('.main-results-content .entity-to-summary').removeClass('label-primary').addClass('label-info');
            },
            'click .parametric-field-name': function(e) {
                if ($(e.currentTarget).siblings('.parametric-values').css('display') == "none" ) {
                    $(e.currentTarget).siblings('.parametric-values').show();
                }else {
                    $(e.currentTarget).siblings('.parametric-values').hide();
                }

            }
        },

        initialize: function() {
            this.entityCollection = new EntityCollection();
            this.documentsCollection = new DocumentsCollection();
            this.topResultsCollection = new DocumentsCollection();
            this.indexesCollection = new IndexesCollection();
            this.fieldsModel = new FieldsModel();
            this.fieldValuesModel = new FieldValuesModel();

            router.on('route:search', function(text) {
                this.entityCollection.reset();
                this.documentsCollection.set([]);

                if (text) {
                    this.$('.find-input').val(text); //when clicking one of the suggested search links
                    this.keyupAnimation();
                } else {
                    this.reverseAnimation(); //when clicking the small 'find' logo
                }
            }, this);

            this.indexesCollection.once('sync', function() {
                this.index = this.indexesCollection.at(0).get('index');
            }, this);

            this.indexesCollection.fetch();
        },

        render: function() {
            this.$el.html(this.template);

            this.$('.find-form').submit(function(e){ //preventing input form submit and page reload
                e.preventDefault();
            });

            this.$('.list-indexes').popover({
                html: true,
                content: this.indexPopover(),
                placement: 'bottom'
            });

            /*indices popover*/
            this.listenTo(this.indexesCollection, 'request', function(){
                if(this.$('.find-form .popover-content').length === 1) {
                    this.$('.find-form  .popover-content').append(_.template(loadingSpinnerTemplate));
                }
            });

            this.listenTo(this.indexesCollection, 'add', function(model){
                this.$('.find-form  .popover-content .loading-spinner').remove();

                this.$('.find-form .popover-content ul').append(this.indexPopoverContents({
                    index: model.get('index')
                }));

                if (model.get('index') === this.index) {
                    this.$('[name="indexRadios"]').val([this.index]);
                }
            });

            /*top 3 results popover*/
            this.listenTo(this.topResultsCollection, 'add', function(model){
                this.$('.suggestions-content .popover-content .loading-spinner').remove();

                this.$('.suggestions-content .popover-content').append(this.topResultsPopoverContents({
                    title: model.get('title'),
                    summary: model.get('summary').trim().substring(0, 100) + "..."
                }));
            });

            /*suggested links*/
            this.listenTo(this.entityCollection, 'request', function() {
                if(!this.$('.suggestions-content ul').length) {
                    this.$('.suggestions-content').append(_.template(loadingSpinnerTemplate));
                }

                this.$('.suggested-links-header').removeClass('hide')
            });

            this.listenTo(this.entityCollection, 'reset', function() {
                this.$('.suggestions-content').empty();

                if (this.entityCollection.isEmpty()) {
                    this.$('.suggested-links-header').addClass('hide')
                }
                else {
                    var clusters = this.entityCollection.groupBy('cluster');

                    _.each(clusters, function(entities) {
                        this.$('.suggestions-content').append(this.suggestionsTemplate({
                            entities: entities
                        }));

                        this.$('.suggestions-content li a').popover({
                            html: true,
                            content: '<h6>Top Results</h6>',
                            placement: 'right',
                            trigger: 'hover'
                        })
                    }, this);

                    this.documentsCollection.each(function(document) {
                        var summary = this.addLinksToSummary(document.get('summary'));

                        this.$('[data-reference="' + document.get('reference') + '"] .result-summary').html(summary);
                    }, this);
                }
            });

            /*main results content*/
            this.listenTo(this.documentsCollection, 'request', function() {
                if(!this.$('.main-results-container').length) {
                    this.$('.main-results-content').append(_.template(loadingSpinnerTemplate));
                }

                this.$('.main-results-content .no-results').remove();
            });

            this.listenTo(this.documentsCollection, 'add', function(model) {
                var reference = model.get('reference');
                var summary = model.get('summary');
                var description = model.get('description');

                if(description.length < 100){
                    summary = this.addLinksToSummary(summary);
                }else {
                    summary = this.addLinksToSummary(description);
                }

                var $newResult = $(_.template(resultsTemplate ,{
                    title: model.get('title'),
                    reference: reference,
                    index: model.get('index'),
                    summary: summary
                }));

                this.$('.main-results-content').append($newResult);

                $newResult.find('.result-header').colorbox({
                    iframe: true,
                    width:'70%',
                    height:'70%',
                    href: '../api/view/view-document?' + $.param({reference: reference}),
                    rel: 'results',
                    current: '{current} of {total}',
                    onComplete: _.bind(function() {
                        $('#cboxPrevious, #cboxNext').remove(); //removing default colorbox nav buttons
                    }, this)
                });

                $newResult.find('.dots').click(function (e) {
                    e.preventDefault();
                    $newResult.find('.result-header').trigger('click'); //dot-dot-dot triggers the colorbox event
                });

            });

            this.listenTo(this.documentsCollection, 'remove', function(model) {
                var reference = model.get('reference');

                this.$('[data-reference="' + reference + '"]').remove();
            });

            this.listenTo(this.documentsCollection, 'sync', function() {
                if(this.documentsCollection.isEmpty()) {
                    this.$('.main-results-content .loading-spinner').remove();
                    this.$('.main-results-content').append(this.noResultsTemplate({i18n: i18n}));
                }
            });

            /*parametric filters*/
            this.listenTo(this.fieldValuesModel, 'change', function(model) {
                var fields = model.keys();

                _.each(fields, function(field) {
                    var values = model.get(field);
                    this.$('[data-fieldName="'+field+'"]').empty();

                    _.each(_.pairs(values), function(value){
                        this.$('[data-fieldName="'+field+'"]').append(_.template(paramValContainer, {
                            value : value
                        }));
                        if (_.indexOf(this.fieldTextParams[field], value[0]) > -1) {
                            this.$('[data-fieldValue="'+value[0]+'"]').find('input').prop('checked', true);
                        }
                    }, this);

                }, this);
            });

            this.listenTo(this.fieldsModel, 'change', function(model) {
                var fields = model.get("all_fields");

                this.$('.parametric-filters').append(_.template(parametricContainer, {
                    fields: fields
                }));

                var fieldName = _.map(fields, function(field) {
                    return field.replace("DOCUMENT/","");
                }).join(',')

                this.parametricRequest(this.$('.find-input').val(),fieldName);

            });

            /*colorbox fancy button override*/
            $('#colorbox').append(_.template(colorboxControlsTemplate));
            $('.nextBtn').on('click', this.handleNextResult);
            $('.prevBtn').on('click', this.handlePrevResult);
        },

        addLinksToSummary: function(summary) {
            //creating an array of the entity titles, longest first
            var entities = this.entityCollection.map(function(entity) {
                return {
                    text: entity.get('text'),
                    id:  _.uniqueId('Find-IOD-Entity-Placeholder')
                }
            }).sort(function(a,b) {
                return b.text.length - a.text.length;
            });

            _.each(entities, function(entity) {
                summary = summary.replace(new RegExp('(^|\\s|[,.-:;?\'"!\\(\\)\\[\\]{}])' + entity.text + '($|\\s|[,.-:;?\'"!\\(\\)\\[\\]{}])', 'gi'), '$1' + entity.id + '$2');
            });

            _.each(entities, function(entity) {
                summary = summary.replace(new RegExp(entity.id, 'g'), '<span class="label label-info entity-to-summary" data-title="'+entity.text+'"><a href="#find/search/'+entity.text+'">' + entity.text + '</a></span>');
            });

            return summary;
        },

        keyupAnimation: _.debounce(function() {
            /*fancy animation*/
            if($.trim(this.$('.find-input').val()).length) { // input has at least one non whitespace character
                this.$('.find').addClass('animated-container').removeClass('reverse-animated-container');

                this.$('.suggested-links-container.span2').show();
                this.searchRequest(this.$('.find-input').val());
            } else {
                this.reverseAnimation();
                vent.navigate('find/search', {trigger: false});
            }
            this.$('.popover').remove();
        }, 500),

        handlePrevResult: function() {
            $.colorbox.prev();
        },

        handleNextResult: function() {
            $.colorbox.next();
        },

        reverseAnimation: function() {
            /*fancy reverse animation*/
            this.$('.find').removeClass('animated-container').addClass('reverse-animated-container');

            this.$('.main-results-content').empty();
            this.$('.suggested-links-container.span2').hide();
            this.$('.find-input').val('');
            this.$('.popover').remove();
        },

        searchRequest: function(input) {
            this.fieldText = this.buildFieldTextFromParams();
            if (this.index) {
                this.documentsCollection.fetch({
                    data: {
                        text: input,
                        fieldtext: this.fieldText,
                        max_results: 30,
                        summary: 'quick',
                        index: this.index,
                        print: 'all'
                    }
                }, this);

                this.entityCollection.fetch({
                    data: {
                        text: input,
                        fieldtext: this.fieldText,
                        index: this.index
                    }
                }, this);

                this.fieldsModel.fetch({
                    data: {
                        index: this.index,
                        group_fields_by_type: true,
                        fieldtype: ["parametric"],
                        max_values: 1000
                    },
                }, this)

                var parametricFields = this.fieldsModel.get('all_fields')

                if(parametricFields) {
                    this.parametricRequest(input, _.map(parametricFields, function(field) {
                        return field.replace("DOCUMENT/","");
                    }).join(','))
                }

                vent.navigate('find/search/' + encodeURIComponent(input), {trigger: false});
                
            }
            else {
                this.indexesCollection.once('sync', function() {
                    this.searchRequest(input);
                }, this);
            }
        },

        parametricRequest: function(text,fieldName){
            this.fieldText = this.buildFieldTextFromParams();
            this.fieldValuesModel.fetch({
                data: {
                    index: this.index,
                    text: text,
                    fieldtext: this.fieldText,
                    fieldname: fieldName,
                    max_values: 20,
                    sort: "alphabetical"
                }
            }, this);
        },

        buildFieldTextFromParams: function(){
            if ($('ul.parametric-values').length){
                var paramFields = $('ul.parametric-values');

                this.fieldTextParams = new Object();

                return _.chain(paramFields).map(function(ul) {
                    var $ul = $(ul)
                    var fieldName = $ul.attr('data-fieldName')

                    this.fieldTextParams[fieldName] = new Array();

                    return _.chain($ul.find('li')).filter(function(li) {
                        return $(li).find('input').prop('checked');
                    }, this).map(function(li) {
                        this.fieldTextParams[fieldName].push($(li).attr('data-fieldValue'));
                        return 'MATCH{' + $(li).attr('data-fieldValue') + '}:' + fieldName
                    }, this).value();
                }, this).flatten().value().join('+AND+');
            }
            else{
                return null;
            }
        }
    });
});
