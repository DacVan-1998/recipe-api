document.addEventListener('DOMContentLoaded', () => {
  // Handle recipe deletion
  const deleteBtn = document.getElementById('deleteRecipe');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      if (!confirm('Are you sure you want to delete this recipe?')) {
        return;
      }

      const recipeId = deleteBtn.dataset.id;
      
      try {
        const response = await fetch(`/api/recipes/${recipeId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete recipe');
        }

        window.location.href = '/';
      } catch (error) {
        alert(error.message);
      }
    });
  }

  // Handle search form
  const searchForm = document.querySelector('.search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(searchForm);
      const params = new URLSearchParams();
      
      for (const [key, value] of formData.entries()) {
        if (value) {
          params.append(key, value);
        }
      }

      window.location.href = `/?${params.toString()}`;
    });
  }
});