import Ember from 'ember';
import ResizeTextareaMixin from '../mixins/resize-textarea';
import FileSaver from 'ember-cli-file-saver/mixins/file-saver';
import RSVP from 'rsvp';

export default Ember.Component.extend(ResizeTextareaMixin, FileSaver, {
  // We need this in case we drag'n'drop dockerText to the text of our dockerfile
  // the size of the textarea should be recalculated

  // Every jQuery event needs to be wrapped inside the ember run loop
  didInsertElement: function() {
    Ember.run.scheduleOnce('afterRender', this, function() {
      // This is necessary because the addition of this addon resets scroll
      Ember.$('#textarea-autocomplete').height(Ember.$('#textarea-autocomplete').prop('scrollHeight'));

      let that = this;

      Ember.$('#textarea-autocomplete').textcomplete([{
          match: /(^|\b)(\w{2,})$/,
          search: function (term, callback) {
              callback(that.get('drcServiceNames').filter(function(service) {
                return service.includes(term);
              }));
          },
          replace: function (word) {
              return word;
          }
      }]);
    });
  },

  drcServiceNames: Ember.computed.oneWay('changeset.serviceNames'),

  textAreaObserver: Ember.observer('changeset.text', function() {
    this.recalculateTextareaSize();
  }),

  disabledSaveButton: Ember.computed('changeset.changes', 'changeset.changes.[]', 'changeset.errors', 'changeset.errors.[]', 'newFile', function() {
    if (this.get('newFile') === true) {
      return false;
    }
    return this.get('changeset.errors.length') > 0 || this.get('changeset.changes.length') === 0;
  }),
  disabledCancelButton: Ember.computed('changeset.changes', 'changeset.changes.[]', 'changeset.errors', 'changeset.errors.[]', 'newFile', function() {
    if (this.get('changeset.errors.length') > 0) {
      return false;
    }
    return this.get('newFile') === false && this.get('changeset.changes.length') === 0;
  }),

  actions: {
    addDockerText: function(item) {
      RSVP.Promise.resolve(item.get('dockerText')).then((itemDockerText) => {
        var dockerText = this.get('changeset.text');
        if (!dockerText) {
          dockerText = "";
        }
        dockerText += "\n" + itemDockerText;
        this.set('changeset.text', dockerText);
        return false;
      });
      // this.sendAction('addDockerText', item);
    },
    showDeleteDialog: function() {
      this.sendAction('showDeleteDialog');
    },
    cancel: function() {
      this.get('changeset').rollback();
      if (this.get('newFile')) {
        this.sendAction('goToCompactView');
        return true;
      }
      return false;
    },
    save: function() {
      this.get('changeset').save();
      this.set('newFile', false);
      this.set('allowDownload', true);
      this.set('allowDelete', true);
      return false;
    },
    download: function() {
      this.get('changeset').save().then(() => {
        let url = "/stack-builder-backend/" + this.get('changeset.id');
        Ember.$.get(url,
          (content) => this.saveFileAs("docker-compose.yml", content, "application/x-yaml"));
      });
      return false;
    }
  }
});
