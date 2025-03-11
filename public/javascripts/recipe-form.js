document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('recipeForm');
  const addIngredientBtn = document.getElementById('addIngredient');
  const addInstructionBtn = document.getElementById('addInstruction');

  // Add new ingredient field
  if (addIngredientBtn) {
    addIngredientBtn.addEventListener('click', () => {
      const ingredientsList = document.getElementById('ingredientsList');
      const newIngredient = document.createElement('div');
      newIngredient.className = 'ingredient-item mb-2';
      newIngredient.innerHTML = `
        <div class="row">
          <div class="col-5">
            <input class="form-control ingredient-name" type="text" placeholder="Ingredient" required>
          </div>
          <div class="col-3">
            <input class="form-control ingredient-quantity" type="number" step="0.01" placeholder="Quantity" required>
          </div>
          <div class="col-3">
            <input class="form-control ingredient-unit" type="text" placeholder="Unit" required>
          </div>
          <div class="col-1">
            <button class="btn btn-danger remove-ingredient" type="button">×</button>
          </div>
        </div>
      `;
      ingredientsList.appendChild(newIngredient);
    });
  }

  // Add new instruction field with image upload
  if (addInstructionBtn) {
    addInstructionBtn.addEventListener('click', () => {
      const instructionsList = document.getElementById('instructionsList');
      const stepNumber = instructionsList.children.length + 1;
      const newInstruction = document.createElement('div');
      newInstruction.className = 'instruction-item mb-4';
      newInstruction.innerHTML = `
        <div class="row">
          <div class="col-11">
            <textarea class="form-control instruction-step" rows="2" required></textarea>
            <div class="image-upload mt-2">
              <label class="form-label">Images for Step ${stepNumber}</label>
              <input class="form-control instruction-images" type="file" name="instruction_images_${stepNumber}" multiple accept="image/*">
              <div class="image-preview mt-2 d-flex gap-2"></div>
            </div>
          </div>
          <div class="col-1">
            <button class="btn btn-danger remove-instruction" type="button">×</button>
          </div>
        </div>
      `;
      instructionsList.appendChild(newInstruction);
      setupImagePreview(newInstruction.querySelector('.instruction-images'));
    });
  }

  // Setup image preview for instruction images
  function setupImagePreview(input) {
    input.addEventListener('change', function() {
      const previewContainer = this.parentElement.querySelector('.image-preview');
      previewContainer.innerHTML = '';

      Array.from(this.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
          const preview = document.createElement('div');
          preview.className = 'position-relative';
          preview.innerHTML = `
            <img src="${e.target.result}" class="img-thumbnail" alt="Preview" style="height: 100px">
            <button class="btn btn-danger btn-sm position-absolute top-0 end-0 remove-preview" type="button">×</button>
          `;
          previewContainer.appendChild(preview);

          preview.querySelector('.remove-preview').addEventListener('click', () => {
            preview.remove();
            // Clear the file input if all previews are removed
            if (previewContainer.children.length === 0) {
              input.value = '';
            }
          });
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // Initialize image previews for existing uploads
  document.querySelectorAll('.instruction-images').forEach(setupImagePreview);

  // Remove handlers
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-ingredient')) {
      e.target.closest('.ingredient-item').remove();
    }
    if (e.target.classList.contains('remove-instruction')) {
      e.target.closest('.instruction-item').remove();
    }
    if (e.target.classList.contains('remove-image')) {
      const imageId = e.target.dataset.imageId;
      if (imageId) {
        const deletedImagesInput = document.getElementById('deleted_images') || (() => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.id = 'deleted_images';
          input.name = 'deleted_images';
          input.value = '';
          form.appendChild(input);
          return input;
        })();
        deletedImagesInput.value = deletedImagesInput.value
          ? `${deletedImagesInput.value},${imageId}`
          : imageId;
      }
      e.target.closest('.position-relative').remove();
    }
  });

  // Form submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        const formData = new FormData(form);
        const recipeId = form.dataset.id;
        const isEdit = Boolean(recipeId);

        // Add ingredients data
        const ingredients = [];
        document.querySelectorAll('.ingredient-item').forEach(item => {
          ingredients.push({
            quantity: parseFloat(item.querySelector('.ingredient-quantity').value),
            unit: item.querySelector('.ingredient-unit').value,
            name: item.querySelector('.ingredient-name').value
          });
        });
        formData.set('ingredients', JSON.stringify(ingredients));

        // Add instructions data
        const instructions = [];
        document.querySelectorAll('.instruction-item').forEach((item, index) => {
          instructions.push({
            step_number: index + 1,
            description: item.querySelector('.instruction-step').value
          });
        });
        formData.set('instructions', JSON.stringify(instructions));

        // Add category IDs
        const categoryIds = Array.from(document.querySelectorAll('input[name="categories[]"]:checked'))
          .map(checkbox => parseInt(checkbox.value));
        formData.set('categoryIds', JSON.stringify(categoryIds));

        // Submit the form
        const response = await fetch(`/api/recipes${isEdit ? `/${recipeId}` : ''}`, {
          method: isEdit ? 'PUT' : 'POST',
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to save recipe');
        }

        const recipe = await response.json();
        window.location.href = `/recipe/${recipe.id}`;
      } catch (error) {
        console.error('Error saving recipe:', error);
        alert(error.message);
      }
    });
  }

  // Add initial ingredient and instruction if creating new recipe
  if (form && !form.dataset.id) {
    addIngredientBtn?.click();
    addInstructionBtn?.click();
  }
});