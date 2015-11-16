//=============================================================================
// QuestManager.js
//=============================================================================

/*:
 * @plugindesc Manages quests.
 * @author Sean Xie
 *
 * @param Quests in Progress
 * @desc The category name for quests in progress.
 * @default Quests in Progress
 *
 * @param Quests Completed
 * @desc The category name for quests completed.
 * @default Quests Completed
 *
 * @help
 *
 * Plugin Command:
 *   QuestManager open                  # Open the quest view
 *   QuestManager add <id> <title>      # Add a quest with <id> with a title
 *   QuestManager update <id> <desc>    # Update the quest with <id> with a description
 *   QuestManager complete <id> <desc>  # Complete the quest with <id> with a description (optional)
 *   QuestManager remove <id>           # Remove the quest with <id>
 *   QuestManager clear                 # Clear all quests
 *
 * Examples:
 *   QuestManager add 4 My first quest. # This creates a quest with title "My first quest." and id 4
 *   QuestManager update 4 Hint         # This updates the quest above with description "Hint"
 *                                      # Note that descriptions are incremental.
 *   QuestManager complete 4            # This completes the quest, adding no description.
 *   QuestManager remove 4              # This removes the quest from the quest view.
 *
 * Warning:
 *   Although it is fine to use any id for your quests (i.e. you can have quest 10 before you have any
 *   of quest 1-9), please try to use the id in an incremental way, for the sake of efficiency.
 */

/*: zh
 * @plugindesc 用于管理任务的系统。
 * @author Sean Xie
 *
 * @param Quests in Progress
 * @desc 正在进行中的任务类别。
 * @default 进行中的任务
 *
 * @param Quests Completed
 * @desc 已完成的任务类别。
 * @default 完成的任务
 *
 * @help
 *
 * 插件命令:
 *   QuestManager open                  # 打开任务界面
 *   QuestManager add <id> <title>      # 添加一个编号为<id>，标题为<title>的任务
 *   QuestManager update <id> <desc>    # 更新任务<id>的描述，增加内容<desc>
 *   QuestManager complete <id> <desc>  # 完成任务<id>，并追加描述<desc>（可不填）
 *   QuestManager remove <id>           # 将任务<id>从任务列表中删除
 *   QuestManager clear                 # 清除所有任务
 *
 * 使用范例:
 *   QuestManager add 4 第一个 任务      # 添加一个编号为4，标题为“第一个 任务”的任务
 *   QuestManager update 4 任务提示。    # 更新任务4的描述，增加内容为“任务提示。”
 *                                      # 注：更新描述不会覆盖原有描述
 *   QuestManager complete 4            # 完成任务4，不添加任何描述
 *   QuestManager remove 4              # 将任务4从任务列表中删除
 *
 * 注意:
 *   你可以为你的每个任务制定任何数字作为编号（即，就算你没有任务1-9，也可以添加任务10），
 *   但是为了不影响系统的运行效率，请尽量从数字小的编号开始使用。
 */

(function() {

    // Wrapper for a single quest
    function QuestEntry(id, title) {
        this.id = id;
        this.title = title;
        this.descriptions = [];
        this.updateDescriptions = function(description) {
            if (description) {
                this.descriptions.push(description);
            }
        };
    }

    var parameters = PluginManager.parameters('SX_QuestManager');
    var questsInProgress = String(parameters['Quests in Progress'] || 'Quests in Progress');
    var questsCompleted = String(parameters['Quests Completed'] || 'Quests Completed');

    var _Game_Interpreter_pluginCommand =
        Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'QuestManager') {
            var parseString = function(string_list) {
                if (string_list) {
                    return string_list.join(" ");
                }
            };
            switch (args[0]) {
                case 'open':
                    SceneManager.push(Scene_QuestBook);
                    break;
                case 'add':
                    $gameSystem.addToQuestBook(Number(args[1]), parseString(args.slice(2)));
                    break;
                case 'update':
                    $gameSystem.updateQuestDescription(Number(args[1]), parseString(args.slice(2)));
                    break;
                case 'complete':
                    $gameSystem.completeQuest(Number(args[1]), parseString(args.slice(2)));
                    break;
                case 'remove':
                    $gameSystem.removeQuest(Number(args[1]));
                    break;
                case 'clear':
                    $gameSystem.clearQuestBook();
                    break;
            }
        }
    };

    Game_System.prototype.addToQuestBook = function(questId, title) {
        if (!this._QuestsInProgress || !this._QuestsCompleted) {
            this.clearQuestBook();
        }
        // check argument
        if (isNaN(questId) || !title) {
            return;
        }
        if (this._QuestsInProgress[questId] || this._QuestsCompleted[questId]) {
            return;
        }
        // initialize the quest
        this._QuestsInProgress[questId] = new QuestEntry(questId, title);
    };

    Game_System.prototype.updateQuestDescription = function(questId, desc) {
        if (!this._QuestsInProgress || !this._QuestsCompleted) {
            return;
        }
        // check argument
        if (isNaN(questId) || !desc) {
            return;
        }
        if (this._QuestsInProgress[questId]) {
            this._QuestsInProgress[questId].updateDescriptions(desc);
        }
        if (this._QuestsCompleted[questId]) {
            this._QuestsCompleted[questId].updateDescriptions(desc);
        }
    };

    Game_System.prototype.completeQuest = function(questId, desc) {
        if (!this._QuestsInProgress || !this._QuestsCompleted) {
            return;
        }
        // check argument
        if (isNaN(questId)) {
            return;
        }
        if (this._QuestsInProgress[questId]) {
            this._QuestsCompleted[questId] = this._QuestsInProgress[questId];
            this._QuestsInProgress.splice(questId, 1);
            if (desc) {
                this._QuestsCompleted[questId].updateDescriptions(desc);
            }
        }
    };

    Game_System.prototype.removeQuest = function(questId) {
        if (!this._QuestsInProgress || !this._QuestsCompleted) {
            return;
        }
        // check argument
        if (isNaN(questId)) {
            return;
        }
        if (this._QuestsInProgress[questId]) {
            this._QuestsInProgress[questId].splice(questId, 1);
        }
        if (this._QuestsCompleted[questId]) {
            this._QuestsCompleted[questId].splice(questId, 1);
        }
    };

    Game_System.prototype.clearQuestBook = function() {
        this._QuestsInProgress = [];
        this._QuestsCompleted = [];
    };

    Game_System.prototype.getQuestsInProgress = function() {
        return this._QuestsInProgress?this._QuestsInProgress:[];
    };

    Game_System.prototype.getQuestsCompleted = function() {
        return this._QuestsCompleted?this._QuestsCompleted:[];
    };


    // Scene
    function Scene_QuestBook() {
        this.initialize.apply(this, arguments);
    }
    Scene_QuestBook.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_QuestBook.prototype.constructor = Scene_QuestBook;

    Scene_QuestBook.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_QuestBook.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createCategoryWindow();
        this.createQuestListWindow();
        this.createQuestDescriptionWindow();
    };

    Scene_QuestBook.prototype.createCategoryWindow = function() {

        this._categoryWindow = new Window_QuestCategory();
        this._categoryWindow.setHandler('ok',     this.onCategoryOk.bind(this));
        this._categoryWindow.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._categoryWindow);
    };

    Scene_QuestBook.prototype.createQuestListWindow = function() {
        var wy = this._categoryWindow.y + this._categoryWindow.height;
        var ww = 300;
        var wh = Graphics.boxHeight - wy;
        this._questListWindow = new Window_QuestList(0, wy, ww, wh);
        this._questListWindow.setHandler('ok',     this.onQuestOk.bind(this));
        this._questListWindow.setHandler('cancel', this.onQuestCancel.bind(this));
        this.addWindow(this._questListWindow);
        this._categoryWindow.setQuestListWindow(this._questListWindow);
    };

    Scene_QuestBook.prototype.createQuestDescriptionWindow = function() {
        var wx = this._questListWindow.width;
        var wy = this._categoryWindow.y + this._categoryWindow.height;
        var ww = Graphics.boxWidth - wx;
        var wh = Graphics.boxHeight - wy;
        this._questDescriptionWindow = new Window_QuestDescription(wx, wy, ww, wh);
        this.addWindow(this._questDescriptionWindow);
        this._questListWindow.setQuestDescriptionWindow(this._questDescriptionWindow);
    };


    Scene_QuestBook.prototype.onCategoryOk = function() {
        this._questListWindow.activate();
    };

    Scene_QuestBook.prototype.onQuestOk = function() {
        this._questListWindow.activate();
    };

    Scene_QuestBook.prototype.onQuestCancel = function() {
        this._questListWindow.deselect();
        this._categoryWindow.activate();
    };

    //-------------------------------------------------------------
    // Category window
    //-------------------------------------------------------------
    function Window_QuestCategory() {
        this.initialize.apply(this, arguments);
    }

    Window_QuestCategory.prototype = Object.create(Window_HorzCommand.prototype);
    Window_QuestCategory.prototype.constructor = Window_QuestCategory;

    Window_QuestCategory.prototype.initialize = function() {
        Window_HorzCommand.prototype.initialize.call(this, 0, 0);
    };

    Window_QuestCategory.prototype.windowWidth = function() {
        return Graphics.boxWidth;
    };

    Window_QuestCategory.prototype.maxCols = function() {
        return 2;
    };

    Window_QuestCategory.prototype.update = function() {
        Window_HorzCommand.prototype.update.call(this);
        if (this._questListWindow) {
            this._questListWindow.setCategory(this.currentSymbol());
        }
    };

    Window_QuestCategory.prototype.makeCommandList = function() {
        this.addCommand(questsInProgress,    'questsInProgress');
        this.addCommand(questsCompleted,  'questsCompleted');
    };

    Window_QuestCategory.prototype.setQuestListWindow = function(questListWindow) {
        this._questListWindow = questListWindow;
        this.update();
    };

    //-------------------------------------------------------------
    // Quest list window
    //-------------------------------------------------------------
    function Window_QuestList() {
        this.initialize.apply(this, arguments);
    }

    Window_QuestList.prototype = Object.create(Window_Selectable.prototype);
    Window_QuestList.prototype.constructor = Window_QuestList;

    Window_QuestList.prototype.initialize = function(x, y, width, height) {
        Window_Selectable.prototype.initialize.call(this, x, y, width, height);
        this._category = 'none';
        this._data = [];
    };

    Window_QuestList.prototype.setCategory = function(category) {
        if (this._category !== category) {
            this._category = category;
            this.refresh();
            this.resetScroll();
        }
    };

    Window_QuestList.prototype.maxCols = function() {
        return 1;
    };

    Window_QuestList.prototype.spacing = function() {
        return 48;
    };

    Window_QuestList.prototype.maxItems = function() {
        return this._data ? this._data.length : 1;
    };

    Window_QuestList.prototype.quest = function() {
        var index = this.index();
        return this._data && index >= 0 ? this._data[index] : null;
    };

    Window_QuestList.prototype.drawItem = function(index) {
        var quest = this._data[index];
        if (quest) {
            var rect = this.itemRect(index);
            this.drawText(quest.title, rect.x, rect.y, rect.width);
        }
    };

    Window_QuestList.prototype.setQuestDescriptionWindow = function(descWindow) {
        this._questDescriptionWindow = descWindow;
    };

    Window_QuestList.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        if (this._questDescriptionWindow) {
            this._questDescriptionWindow.setQuest(this.quest());
        }
    };

    Window_QuestList.prototype.refresh = function() {
        this._data = [];
        var i, list;
        switch (this._category) {
            case 'questsInProgress':
                list = $gameSystem.getQuestsInProgress();
                break;
            case 'questsCompleted':
                list = $gameSystem.getQuestsCompleted();
                break;
            default:
                break;
        }
        if (list) {
            for (i=0; i<list.length; i++) {
                if (list[i]) {
                    this._data.push(list[i]);
                }
            }
        }
        this.createContents();
        this.drawAllItems();
    };
    //-------------------------------------------------------------
    // Quest Description window
    //-------------------------------------------------------------
    function Window_QuestDescription() {
        this.initialize.apply(this, arguments);
    }
    Window_QuestDescription.prototype = Object.create(Window_Base.prototype);
    Window_QuestDescription.prototype.constructor = Window_QuestDescription;

    Window_QuestDescription.prototype.initialize = function(x, y, width, height) {
        Window_Base.prototype.initialize.call(this, x, y, width, height);
    };

    Window_QuestDescription.prototype.setQuest = function(quest) {
        if (quest !== this._quest) {
            this._quest = quest;
            this.refresh();
        }
    };

    Window_QuestDescription.prototype.refresh = function() {
        this.contents.clear();
        var x = 0;
        var y = 0;
        if (this._quest) {
            var descriptions = this._quest.descriptions;
            if (this._quest.descriptions) {
                for (var i=0; i<descriptions.length; i++) {
                    var textState = { index: 0, x: x, y: y, left: x };
                    textState.text = descriptions[i] + "\n";
                    this.drawTextEx(descriptions[i] + "<wrap>\n", x, y);
                    y+=this.calcTextHeight(textState, false);
                    console.log(descriptions[i]);
                }
            }
        }
    };

})();