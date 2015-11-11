//=============================================================================
// SX_CraftBox.js
//=============================================================================

/*:
 * @plugindesc Supports for crafting items.
 * @author Sean Xie
 *
 * @help
 *
 * Plugin Command:
 *   CraftBox open            # Open the crafting view
 *   CraftBox add armor 1     # Add the recipe of armor #1 to the craft book
 *
 * Item (Weapon, Armor) Note:
 *   <recipe:item 1 5 item 2 1>     # This item requires 5 item #1 and 1 item #2 to craft
 */
(function() {

    var _Game_Interpreter_pluginCommand =
        Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'CraftBox') {
            switch (args[0]) {
                case 'open':
                    SceneManager.push(Scene_CraftBox);
                    break;
                case 'add':
                    $gameSystem.addToCraftBook(args[1], Number(args[2]));
                    break;
                case 'clear':
                    $gameSystem.clearItemBook();
                    break;
            }
        }
    };

    function CraftRecipe(item) {
        this.item = item;
        this.ingredients = [];

        this.addIngredient = function (item, count) {
            this.ingredients.push(new CraftIngredient(item, count));
        }
    }

    function CraftIngredient(item, count) {
        this.item = item;
        this.count = count;
    }

    Game_System.prototype.addToCraftBook = function(type, dataId) {
        if (!this._CraftRecipes) {
            this.clearCraftBook();
        }
        var item = this.getCraftBoxItemByType(type, dataId);
        // Check the recipe of the item
        if (item) {
            var itemRecipeString = String(item.meta.recipe).split(" ");
            var itemRecipe = new CraftRecipe(item);
            if (itemRecipeString.length > 0 && itemRecipeString.length %3 == 0) {
                // Validate the recipe
                for (var i = 0; i < itemRecipeString.length; i+=3) {
                    var itemType, itemId, itemCount, itemEntity;
                    itemType = itemRecipeString[i];
                    itemId = parseInt(itemRecipeString[i + 1]);
                    itemCount = parseInt(itemRecipeString[i + 2]);
                    // check the numbers
                    if (isNaN(itemId) || itemCount < 1) {
                        return;
                    }
                    // check item type
                    itemEntity =  this.getCraftBoxItemByType(itemType, itemId);
                    if (!item) {
                        return;
                    }
                    // push the ingredient for the recipe
                    itemRecipe.addIngredient(itemEntity, itemCount);
                }
                this._CraftRecipes.push(itemRecipe);
            }
        }
    };

    Game_System.prototype.clearCraftBook = function() {
        this._CraftRecipes = [];
    };

    Game_System.prototype.getAllCraftRecipes = function() {
        return this._CraftRecipes;
    };

    Game_System.prototype.getCraftBoxItemByType = function(type, dataId) {
        var item;
        switch (type) {
            case 'item':
                item = $dataItems[dataId];
                break;
            case 'weapon':
                item = $dataWeapons[dataId];
                break;
            case 'armor':
                item = $dataArmors[dataId];
                break;
            default:
                // unrecognized type
                return;
        }
        if (item.name) {
            return item;
        }
    };

    function Scene_CraftBox() {
        this.initialize.apply(this, arguments);
    }

    Scene_CraftBox.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_CraftBox.prototype.constructor = Scene_CraftBox;

    Scene_CraftBox.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_CraftBox.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this._indexWindow = new Window_CraftBookIndex(0, 0);
        this._indexWindow.setHandler('cancel', this.popScene.bind(this));
        var wy = this._indexWindow.height;
        var ww = Graphics.boxWidth;
        var wh = Graphics.boxHeight - wy;
        this._statusWindow = new Window_CraftBookStatus(0, wy, ww, wh);
        this.addWindow(this._indexWindow);
        this.addWindow(this._statusWindow);
        this._indexWindow.setStatusWindow(this._statusWindow);
    };

    function Window_CraftBookIndex() {
        this.initialize.apply(this, arguments);
    }

    Window_CraftBookIndex.prototype = Object.create(Window_Selectable.prototype);
    Window_CraftBookIndex.prototype.constructor = Window_CraftBookIndex;

    Window_CraftBookIndex.lastTopRow = 0;
    Window_CraftBookIndex.lastIndex  = 0;

    Window_CraftBookIndex.prototype.initialize = function(x, y) {
        var width = Graphics.boxWidth;
        var height = this.fittingHeight(6);
        Window_Selectable.prototype.initialize.call(this, x, y, width, height);
        this.refresh();
        this.setTopRow(Window_CraftBookIndex.lastTopRow);
        this.select(Window_CraftBookIndex.lastIndex);
        this.setHandler('ok',     this.onItemOk.bind(this));
        this.activate();
    };

    Window_CraftBookIndex.prototype.maxCols = function() {
        return 3;
    };

    Window_CraftBookIndex.prototype.maxItems = function() {
        return this._list ? this._list.length : 0;
    };

    Window_CraftBookIndex.prototype.setStatusWindow = function(statusWindow) {
        this._statusWindow = statusWindow;
        this.updateStatus();
    };

    Window_CraftBookIndex.prototype.isCurrentItemEnabled = function() {
        var recipe = this._list[this.index()];
        if (recipe) {
            var ingredient = recipe.ingredients[0];
            var item = ingredient.item;
            return $gameParty.numItems(item) >= ingredient.count;
        }
        return false;
    };

    Window_CraftBookIndex.prototype.onItemOk = function() {
        var recipe = this._list[this.index()];
        var ingredient = recipe.ingredients[0];
        var item = ingredient.item;
        $gameParty.loseItem(item, ingredient.count);
        $gameParty.gainItem(recipe.item, 1);
        this._statusWindow.refresh();
        this.refresh();
        this.activate();
    };

    Window_CraftBookIndex.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        this.updateStatus();
    };

    Window_CraftBookIndex.prototype.updateStatus = function() {
        if (this._statusWindow) {
            var recipe = this._list[this.index()];
            this._statusWindow.setRecipe(recipe);
        }
    };

    Window_CraftBookIndex.prototype.refresh = function() {
        var i;
        this._list = [];

        var allRecipes = $gameSystem.getAllCraftRecipes();
        if (allRecipes) {
            for (i = 0; i < allRecipes.length; i++) {
                this._list.push(allRecipes[i]);
            }
        }
        this.createContents();
        this.drawAllItems();
    };

    Window_CraftBookIndex.prototype.drawItem = function(index) {
        var recipe = this._list[index];
        var rect = this.itemRect(index);
        var width = rect.width - this.textPadding();
        this.drawItemName(recipe.item, rect.x, rect.y, width);
    };

    Window_CraftBookIndex.prototype.processCancel = function() {
        Window_Selectable.prototype.processCancel.call(this);
        Window_CraftBookIndex.lastTopRow = this.topRow();
        Window_CraftBookIndex.lastIndex = this.index();
    };

    function Window_CraftBookStatus() {
        this.initialize.apply(this, arguments);
    }

    Window_CraftBookStatus.prototype = Object.create(Window_Base.prototype);
    Window_CraftBookStatus.prototype.constructor = Window_CraftBookStatus;

    Window_CraftBookStatus.prototype.initialize = function(x, y, width, height) {
        Window_Base.prototype.initialize.call(this, x, y, width, height);
    };

    Window_CraftBookStatus.prototype.setRecipe = function(recipe) {
        if (this._recipe !== recipe) {
            this._recipe = recipe;
            this.refresh();
        }
    };

    Window_CraftBookStatus.prototype.refresh = function() {
        var recipe = this._recipe;
        var x = 0;
        var y = 0;
        var lineHeight = this.lineHeight();

        this.contents.clear();

        // list the ingredients
        var ingredient = recipe.ingredients[0];
        var item = ingredient.item;

        this.drawItemName(ingredient.item, x, y);

        x = this.textPadding();
        y = lineHeight + this.textPadding();

        //var count = item.price > 0 ? item.price : '-';
        var countText = ingredient.count + "/" + $gameParty.numItems(item);
        this.changeTextColor(this.systemColor());
        this.drawText("需要/现有", x, y, 120);
        this.resetTextColor();
        this.drawText(countText, x + 120, y, 120, 'right');
    };
})();