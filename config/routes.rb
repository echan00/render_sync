Rails.application.routes.draw do
  get 'render_sync/refetch', controller: 'render_sync/refetches', action: 'show'
end