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
 *                            # You must include the recipe in the note for armor #1
 *   CraftBox clear           # Clear the craft book
 *
 * Item (Weapon, Armor) Note:
 *   <recipe:item:1:5 item:2:1>     # This item requires 5 item #1 and 1 item #2 to craft
 *                                  # <recipe:(type):(id):(quantity) ...>
 */

/*: zh
 * @plugindesc 可以合成物品装备的脚本。
 * @author Sean Xie
 *
 * @help
 *
 * Plugin Command:
 *   CraftBox open            # 打开合成界面
 *   CraftBox add armor 1     # 将防具#1的合成公式加入合成书中
 *                            # 你需要将合成公式写入防具#1的备注里
 *   CraftBox clear           # 清空合成书
 *
 * 物品（武器，防具）备注:
 *   <recipe:item:1:5 item:2:1>     # 这个物品需要5x物品#1以及1x物品#2来合成
 *                                  # <recipe:(类型):(编号):(数量) ...>
 */
(function() {

    // Wrapper for recipe
    function CraftRecipe(type, dataId) {
        this._type = type;
        this._dataId = dataId;
        this.ingredients = [];
        this.addIngredient = function (dataType, dataId, count) {
            this.ingredients.push(new CraftIngredient(dataType, dataId, count));
        };
        this.getItem = function() {
            return $gameSystem.getItemByTypeAndId(this._type, this._dataId);
        };
    }

    function CraftIngredient(dataType, dataId, count) {
        this._dataType = dataType;
        this._dataId = dataId;
        this.count = count;
        this.getItem = function() {
            return $gameSystem.getItemByTypeAndId(this._dataType, this._dataId);
        };
    }

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
                    $gameSystem.clearCraftBook();
                    break;
            }
        }
    };

    Game_System.prototype.addToCraftBook = function(type, dataId) {
        if (!this._CraftRecipes) {
            this.clearCraftBook();
        }
        var itemRecipe = new CraftRecipe(type, dataId);
        var item = itemRecipe.getItem();
        // Check the recipe of the item
        if (item) {
            var ingredientList = String(item.meta.recipe).split(" ");
            if (ingredientList.length > 0) {
                // Validate the recipe
                for (var i=0; i<ingredientList.length; i++) {
                    var ingredientStringList = String(ingredientList[i]).split(":");
                    var ingredientType = ingredientStringList[0];
                    var ingredientId = parseInt(ingredientStringList[1]);
                    var ingredientCount = parseInt(ingredientStringList[2]);
                    // Validate this ingredient
                    if (isNaN(ingredientCount) || ingredientCount < 1 || !$gameSystem.getItemByTypeAndId(ingredientType, ingredientId)) {
                        return;
                    }
                    itemRecipe.addIngredient(ingredientType, ingredientId, ingredientCount);
                }
                if (this.addToCraftRecipesList(type, dataId, itemRecipe)) {
                    this._CraftRecipes.push(itemRecipe);
                }
            }
        }
    };

    Game_System.prototype.clearCraftBook = function() {
        this._CraftRecipes = [];
        this._CraftRecipesList = [[],[],[]];
    };

    Game_System.prototype.addToCraftRecipesList = function(type, dataId, recipe) {
        var typeIndex;
        switch(type) {
            case 'item':
                typeIndex = 0;
                break;
            case 'weapon':
                typeIndex = 1;
                break;
            case 'armor':
                typeIndex = 2;
                break;
            default:
                // unrecognized type
                return false;
        }
        if (this._CraftRecipesList) {
            if (this._CraftRecipesList[typeIndex][dataId]) {
                return false; // already exist
            }
            this._CraftRecipesList[typeIndex][dataId]=recipe;
            return true;
        }
        return false;
    };

    Game_System.prototype.getCraftRecipes = function() {
        return this._CraftRecipes;
    };

    Game_System.prototype.getItemByTypeAndId = function(dataType, dataId) {
        var item;
        switch (dataType) {
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
        return item;
    };

    // View of craft box

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
        this.createHelpWindow();
        this.createCraftBookWindow();
        //this.createIngredientWindow();
    };

    Scene_CraftBox.prototype.createCraftBookWindow = function() {

        var wy = this._helpWindow.height;
        var wh = Graphics.boxHeight - wy;
        var ww = Graphics.boxWidth/2;
        this._craftBookWindow = new Window_CraftBookIndex(0, wy, ww, wh);
        this._craftBookWindow.setHelpWindow(this._helpWindow);
        this._craftBookWindow.setHandler('ok',     this.onCraftBookOk.bind(this));
        this._craftBookWindow.setHandler('cancel', this.popScene.bind(this));
        var wwx = this._craftBookWindow.width;
        var www = Graphics.boxWidth - this._craftBookWindow.width;
        this._craftBookStatus = new Window_CraftBookStatus(wwx, wy, www, wh);
        this._craftBookWindow.setStatusWindow(this._craftBookStatus);
        this.addWindow(this._craftBookWindow);
        this.addWindow(this._craftBookStatus);
        this._craftBookWindow.activate();
        this._craftBookWindow.refresh();
        this._craftBookStatus.refresh();
    };

    Scene_CraftBox.prototype.onCraftBookOk = function() {
        var recipe = this._craftBookWindow.recipe();
        // Assume we have enough items
        // TODO additional check
        recipe.ingredients.forEach(function(ingredient) {
            var item = ingredient.getItem();
            $gameParty.loseItem(item, ingredient.count);
        });
        $gameParty.gainItem(recipe.getItem(), 1);
        this._craftBookStatus.refresh();
        this._craftBookWindow.refresh();
        this._craftBookWindow.activate();
    };

    function Window_CraftBookIndex() {
        this.initialize.apply(this, arguments);
    }

    Window_CraftBookIndex.prototype = Object.create(Window_Selectable.prototype);
    Window_CraftBookIndex.prototype.constructor = Window_CraftBookIndex;

    Window_CraftBookIndex.prototype.initialize = function(x, y, width, height) {
        Window_Selectable.prototype.initialize.call(this, x, y, width, height);
        this._data = [];
    };

    Window_CraftBookIndex.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        if (this._statusWindow) {
            var recipe = this._data[this.index()];
            this._statusWindow.setRecipe(recipe);
        }
    };

    Window_CraftBookIndex.prototype.setStatusWindow = function(statusWindow) {
       this._statusWindow = statusWindow;
    };

    Window_CraftBookIndex.prototype.maxCols = function() {
        return 1;
    };

    Window_CraftBookIndex.prototype.maxItems = function() {
        return this._data ? this._data.length : 0;
    };

    Window_CraftBookIndex.prototype.recipe = function() {
        var index = this.index();
        return this._data && index >= 0 ? this._data[index] : null;
    };

    Window_CraftBookIndex.prototype.makeItemList = function() {
        this._data = [];
        var recipes = $gameSystem.getCraftRecipes();
        if (recipes) {
            for (var i=0; i<recipes.length; i++) {
                this._data.push(recipes[i]);
            }
        }
    };

    Window_CraftBookIndex.prototype.drawItem = function(index) {
        var recipe = this._data[index];
        var rect = this.itemRect(index);
        this.changePaintOpacity(this.isEnabled(recipe));
        var width = rect.width - this.textPadding();
        this.drawItemName(recipe.getItem(), rect.x, rect.y, width);
        this.changePaintOpacity(1);
    };

    Window_CraftBookIndex.prototype.isEnabled = function(recipe) {
        if (!recipe) {
            return false;
        }
        for (var i=0; i<recipe.ingredients.length; i++) {
            var item = recipe.ingredients[i].getItem();
            if ($gameParty.numItems(item) < recipe.ingredients[i].count) {
                return false;
            }
        }
        return true;
    };

    Window_CraftBookIndex.prototype.isCurrentItemEnabled = function() {
        return this.isEnabled(this.recipe());
    };

    Window_CraftBookIndex.prototype.updateHelp = function() {
        this.setHelpWindowItem(this.recipe()?this.recipe().getItem():null);
    };

    Window_CraftBookIndex.prototype.refresh = function() {
        this.makeItemList();
        this.createContents();
        this.drawAllItems();
    };

    function Window_CraftBookStatus() {
        this.initialize.apply(this, arguments);
    }

    Window_CraftBookStatus.prototype = Object.create(Window_Selectable.prototype);
    Window_CraftBookStatus.prototype.constructor = Window_CraftBookStatus;

    Window_CraftBookStatus.prototype.initialize = function(x, y, width, height) {
        Window_Selectable.prototype.initialize.call(this, x, y, width, height);
    };

    Window_CraftBookStatus.prototype.setRecipe = function(recipe) {
        if (this._recipe !== recipe) {
            this._recipe = recipe;
            this.refresh();
        }
    };

    Window_CraftBookStatus.prototype.maxCols = function() {
        return 1;
    };

    Window_CraftBookStatus.prototype.maxItems = function() {
        return this._recipe ? this._recipe.ingredients.length : 0;
    };

    Window_CraftBookStatus.prototype.refresh = function() {
        this.createContents();
        this.drawAllItems();
    };

    Window_CraftBookStatus.prototype.drawItem = function(index) {
        var ingredient = this._recipe.ingredients[index];
        if (ingredient) {
            var item = ingredient.getItem();
            var count = ingredient.count;
            var available = $gameParty.numItems(item);
            var numberWidth = this.textWidth('000/00');
            var rect = this.itemRect(index);
            rect.width -= this.textPadding();
            this.changePaintOpacity(available >= count);
            this.drawItemName(item, rect.x, rect.y, rect.width - numberWidth);
            // draw the need/have text.
            this.drawText(count + '/' + available, rect.x, rect.y, rect.width, 'right');
            this.changePaintOpacity(1);
        }
    };


})();