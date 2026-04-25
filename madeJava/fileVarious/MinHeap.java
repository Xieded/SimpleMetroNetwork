package fileVarious;

import java.util.*;

public class MinHeap<T> {
    private final List<T> heap;
    private final Comparator<T> comparator;

    public MinHeap(Comparator<T> comparator) {
        this.heap = new ArrayList<>();
        this.comparator = comparator;
    }

    public void push(T value) {
        heap.add(value);
        siftUp(heap.size() - 1);
    }

    public T pop() {
        if (heap.isEmpty()) return null;
        T top = heap.get(0);
        T bottom = heap.remove(heap.size() - 1);
        if (!heap.isEmpty()) {
            heap.set(0, bottom);
            siftDown(0);
        }
        return top;
    }

    public boolean isEmpty() {
        return heap.isEmpty();
    }

    private void siftUp(int index) {
        while (index > 0) {
            int parent = (index - 1) >> 1;
            if (comparator.compare(heap.get(index), heap.get(parent)) < 0) {
                Collections.swap(heap, index, parent);
                index = parent;
            } else break;
        }
    }

    private void siftDown(int index) {
        int n = heap.size();
        while (true) {
            int left = index * 2 + 1;
            int right = left + 1;
            int smallest = index;
            if (left < n && comparator.compare(heap.get(left), heap.get(smallest)) < 0) smallest = left;
            if (right < n && comparator.compare(heap.get(right), heap.get(smallest)) < 0) smallest = right;
            if (smallest != index) {
                Collections.swap(heap, index, smallest);
                index = smallest;
            } else break;
        }
    }
}