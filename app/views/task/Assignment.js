import $ from 'jquery';
import _ from 'underscore';
import util from 'util';
import Task from 'game/Task';
import Tasks from './Tasks';
import templ from '../Common';
import View from 'views/View';
import CardsList from 'views/CardsList';

const template = data => `
<div class="tasks the-task"><ul class="cards"></ul></div>
<ul class="tabs">
  <li class="selected" data-tab="assign-workers">Employees</li>
  <li data-tab="assign-locations">Locations</li>
</ul>
<ul class="cards assign-workers tab-page selected"></ul>
<ul class="cards assign-locations tab-page"></ul>
<div class="actions">
  <button class="select" disabled>Start${data.task.obj.cost ? ` for ${util.formatCurrency(data.task.obj.cost)}` : ''}</button>
</div>`;

const workerTemplate = item => `
<div class="worker-avatar">
  <img src="/assets/workers/gifs/${item.avatar}.gif">
</div>
<div class="worker-info">
  <div class="worker-title">
    <h1>${item.name}</h1>
    <h3 class="subtitle">${item.title}, <span class="cash">${util.formatCurrencyAbbrev(item.salary)}/yr</span></h3>
  </div>
  <div class="worker-body">
    ${templ.skills(item)}
    ${item.attributes.length > 0 ? templ.attributes(item) : ''}
  </div>
  ${item.task ? `<div class="worker-task">Current task: ${item.task.obj.name} (TODO completion %)</div>` : ''}
</div>
`
const locationTemplate = item => `
<div class="title">
  <h1>${item.name}</h1>
  <h4 class="cash">${util.formatCurrencyAbbrev(item.cost)}</h4>
</div>
${templ.skills(item.skills)}
${item.effects.length > 0 ? templ.effects(item) : ''}
${item.task ? `<div class="worker-task">Current task: ${item.task.obj.name}</div>` : ''}`;


class AssignmentView extends CardsList {
  constructor(player, task) {
    super({
      title: 'Assign Task',
      template: template
    });
    this.task = task;
    this.player = player;
    this.workers = _.filter(player.company.workers, w => w.task == task.id);
    this.locations = _.filter(player.company.locations, l => l.task == task.id);
    this.registerHandlers({
      '.tabs li': function(ev) {
        var target = $(ev.target).data('tab');
        $('.tabs .selected').removeClass('selected');
        $(ev.target).addClass('selected');
        $('.tab-page').hide();
        $(`.tab-page.${target}`).show();
      },
      '.assign-workers > li': function(ev) {
        var idx = this.itemIndex(ev.target),
            sel = player.company.workers[idx],
            view = this.subviews[idx];

        var $li = $(ev.target).closest('.card');
        if (_.contains(this.workers, sel)) {
          this.workers = _.without(this.workers, sel);
          view.attrs.class = view.attrs.class.replace('selected', '');
        } else {
          this.workers.push(sel);
          view.attrs.class += ' selected';
        }
        this.el.find('.select').prop('disabled', this.workers.length + this.locations.length == 0);
        view.render(this.processItem(sel, true));
        this.el.find('.task-assignees, .task-no-assignees').replaceWith(Tasks.Assignees(this.processTask(this.task)));
      },
      '.assign-locations > li': function(ev) {
        var idx = this.itemIndex(ev.target),
            sel = player.company.locations[idx],
            view = this.subviews[player.company.workers.length + idx];

        var $li = $(ev.target).closest('.card');
        if (_.contains(this.locations, sel)) {
          this.locations = _.without(this.locations, sel);
          view.attrs.class = view.attrs.class.replace('selected', '');
        } else {
          this.locations.push(sel);
          view.attrs.class += ' selected';
        }
        this.el.find('.select').prop('disabled', this.workers.length + this.locations.length == 0);
        view.render(this.processItem(sel, false));
        this.el.find('.task-assignees, .task-no-assignees').replaceWith(Tasks.Assignees(this.processTask(this.task)));
      },
      '.select': function() {
        if (task.obj.cost) {
          player.company.pay(task.obj.cost, true);
        }
        player.company.startTask(task, this.workers, this.locations);
        this.remove();
      }
    });
  }

  processItem(item, worker) {
    var item = _.clone(item);
    item.task = this.player.company.task(item.task);
    return _.extend({
      worker: worker
    }, item);
  }

  render() {
    var player = this.player,
        workers = _.map(player.company.workers, w => this.processItem(w, true)),
        locations = _.map(player.company.locations, l => this.processItem(l, false));
    super.render({
      task: this.task,
      items: workers.concat(locations)
    });

    var task = this.task,
        template = Tasks.Basic,
        attrs = {
          class: `task-${util.slugify(util.enumName(task.type, Task.Type))}`
        };
    switch(task.type) {
        case Task.Type.Promo:
          task.img = `assets/promos/${util.slugify(task.obj.name)}.png`;
          break;
        case Task.Type.Research:
          task.img = `assets/techs/${util.slugify(task.obj.name)}.png`;
          break;
        case Task.Type.Lobby:
          attrs.style = `background-image:url(assets/lobbying/${util.slugify(task.obj.name)}.jpg)`
          break;
        case Task.Type.Product:
          template = Tasks.Product;
          break;
        case Task.Type.SpecialProject:
          template = Tasks.SpecialProject;
          break;
    }
    this.taskView = new View({
      tag: 'li',
      parent: '.tasks .cards',
      template: template,
      attrs: attrs
    });
    this.taskView.render(this.processTask(task));
  }

  processTask(task) {
    return _.extend({
      workers: this.workers,
      locations: this.locations,
      hideActions: true,
      hideProgress: true
    }, task);
  }

  createListItem(item) {
    var template = item.worker ? workerTemplate : locationTemplate,
        parent = item.worker ? '.assign-workers' : '.assign-locations';
    return new View({
      tag: 'li',
      parent: parent,
      template: template,
      method: 'append'
    })
  }
}

export default AssignmentView;
