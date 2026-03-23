import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCategories, createListing } from '../../api/listings.api';
import toast from 'react-hot-toast';

export default function CreateListing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos]   = useState([]);
  const [previews, setPreviews] = useState([]);

  const [form, setForm] = useState({
    title: '', description: '', categoryId: '',
    pricePerUnit: '', unitLabel: 'per kg',
    quantityAvailable: '', harvestDate: '',
    isOrganic: false, listingType: 'standard'
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => getCategories().then(r => r.data)
  });

  function handleChange(e) {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  }

  function handlePhotos(e) {
    const files = Array.from(e.target.files);
    setPhotos(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      photos.forEach(p => data.append('photos', p));

      await createListing(data);
      toast.success('Listing created!');
      navigate('/listings/mine');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🌱 List Your Produce</h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Produce Name *
              </label>
              <input name="title" value={form.title} onChange={handleChange}
                required placeholder="e.g. Fresh Organic Spinach"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea name="description" value={form.description} onChange={handleChange}
                rows={3} placeholder="How was it grown? Any special notes?"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select name="categoryId" value={form.categoryId} onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Select category</option>
                {categories?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Price + Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (₹) *
                </label>
                <input name="pricePerUnit" value={form.pricePerUnit} onChange={handleChange}
                  type="number" min="0" step="0.5" required placeholder="40"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                             focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Label *
                </label>
                <select name="unitLabel" value={form.unitLabel} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                             focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option>per kg</option>
                  <option>per bunch</option>
                  <option>per piece</option>
                  <option>per litre</option>
                  <option>per pack</option>
                </select>
              </div>
            </div>

            {/* Quantity + Harvest Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity Available *
                </label>
                <input name="quantityAvailable" value={form.quantityAvailable}
                  onChange={handleChange} type="number" min="1" required placeholder="10"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                             focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Harvest Date *
                </label>
                <input name="harvestDate" value={form.harvestDate} onChange={handleChange}
                  type="date" required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                             focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>

            {/* Listing Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Listing Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['standard', 'surplus'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm({ ...form, listingType: t })}
                    className={`py-3 rounded-xl border-2 font-medium capitalize transition-all
                      ${form.listingType === t
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-500'}`}>
                    {t === 'standard' ? '🌿 Standard' : '⚡ Surplus'}
                  </button>
                ))}
              </div>
            </div>

            {/* Organic Toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="isOrganic" checked={form.isOrganic}
                onChange={handleChange}
                className="w-4 h-4 accent-green-600" />
              <span className="text-sm font-medium text-gray-700">
                🌱 This produce is organically grown (self-declared)
              </span>
            </label>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos (up to 5)
              </label>
              <input type="file" accept="image/*" multiple onChange={handlePhotos}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                           file:rounded-lg file:border-0 file:bg-green-50
                           file:text-green-700 file:font-medium
                           hover:file:bg-green-100 cursor-pointer" />
              {previews.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {previews.map((src, i) => (
                    <img key={i} src={src} alt=""
                         className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300
                         text-white font-semibold py-3 rounded-xl transition-colors">
              {loading ? 'Creating listing...' : 'Publish Listing'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
